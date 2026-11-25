import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Modal } from 'react-native';
// Gesture-handler ScrollView cooperates with the sheet's drag-to-dismiss pan;
// the plain RN ScrollView loses vertical drags to it and can't scroll.
import {
  GestureHandlerRootView,
  ScrollView,
} from 'react-native-gesture-handler';
import {
  BadgeIcon,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
  IconName,
  ListItem,
  SectionDivider,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
// NOTE: the sheet shell stays on the component-library BottomSheet for now —
// its drag/scroll interplay inside the Modal was just tuned; migrating to the
// MMDS BottomSheet is a follow-up.
import BottomSheet, {
  type BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { playSelection } from '../../../../util/haptics';
import TraderAvatar from '../../SocialFeed/components/TraderAvatar';
import {
  formatAbbreviatedUsd,
  formatTokenAmount,
  formatTradeDate,
  formatTradeUnitPrice,
} from '../../SocialFeed/utils/formatters';
import type {
  CandleAvatarMarkerEntry,
  CandleAvatarMarkerLookup,
} from './mapFollowingPositionsToCandleAvatarMarkers';

/** Avatar diameter for a row. */
const ROW_AVATAR_SIZE = 36;
/** Cap the scroll area so a large cluster doesn't swallow the screen. */
const MAX_LIST_HEIGHT = 360;

type TradeFilter = 'all' | 'buy' | 'sell';

export interface SocialMarkersBottomSheetProps {
  /** Member marker ids of the tapped avatar group (one for a lone avatar). */
  ids: string[];
  /** Marker-id → trade/actor lookup from the markers hook. */
  byId: CandleAvatarMarkerLookup;
  onClose: () => void;
  /**
   * Called with the tapped row's trade AFTER the sheet finishes closing, so the
   * caller can navigate without the new screen opening under this Modal.
   * Rows are not pressable when omitted.
   */
  onTradePress?: (entry: CandleAvatarMarkerEntry) => void;
}

/**
 * Trader avatar with a buy(+)/sell(-) intent badge, built from MMDS
 * `BadgeWrapper` (circular anchor, bottom-right) + `BadgeIcon`.
 */
const AvatarWithIntent: React.FC<{
  entry: CandleAvatarMarkerEntry;
  isBuy: boolean;
}> = ({ entry, isBuy }) => {
  const { actor } = entry;
  return (
    <BadgeWrapper
      position={BadgeWrapperPosition.BottomRight}
      badge={
        <BadgeIcon
          iconName={isBuy ? IconName.Add : IconName.Minus}
          twClassName={`border-2 border-background-default ${
            isBuy ? 'bg-success-default' : 'bg-error-default'
          }`}
        />
      }
    >
      <TraderAvatar
        imageUrl={actor.imageUrl}
        address={actor.address}
        profileId={actor.profileId}
        size={ROW_AVATAR_SIZE}
      />
    </BadgeWrapper>
  );
};

/** Buy / Sell tag shown beside the trader name (MMDS `Tag`). */
const DirectionTag: React.FC<{ isBuy: boolean }> = ({ isBuy }) => (
  <Tag
    severity={isBuy ? TagSeverity.Success : TagSeverity.Danger}
    twClassName="shrink-0"
  >
    {/* NOTE (spike): placeholder copy — add Buy/Sell i18n keys before launch. */}
    {isBuy ? 'Buy' : 'Sell'}
  </Tag>
);

export const SOCIAL_MARKERS_SHEET_ROW_TEST_ID = 'social-markers-sheet-row';

/**
 * One trade row (MMDS `ListItem`): avatar (+/-) start accessory, name + Buy/Sell
 * tag / date on the left, value / size on the right. Pressable only when
 * `onPress` is provided.
 */
const TradeRow: React.FC<{
  entry: CandleAvatarMarkerEntry;
  onPress?: (entry: CandleAvatarMarkerEntry) => void;
}> = ({ entry, onPress }) => {
  const { actor, trade, position } = entry;
  const isBuy = trade.direction === 'buy';
  const unitPrice =
    trade.tokenAmount > 0 ? trade.usdCost / trade.tokenAmount : null;

  const content = {
    startAccessory: <AvatarWithIntent entry={entry} isBuy={isBuy} />,
    accessoryGap: 3 as const,
    title: (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextDefault}
        numberOfLines={1}
        twClassName="shrink min-w-0 font-medium"
      >
        {actor.name}
      </Text>
    ),
    titleEndAccessory: <DirectionTag isBuy={isBuy} />,
    description: formatTradeDate(trade.timestamp),
    value: (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextDefault}
        twClassName="font-medium"
      >
        {formatAbbreviatedUsd(trade.usdCost)}
      </Text>
    ),
    subvalue: `${formatTokenAmount(trade.tokenAmount)} ${position.tokenSymbol}${
      unitPrice != null ? ` at ${formatTradeUnitPrice(unitPrice)}` : ''
    }`,
    testID: SOCIAL_MARKERS_SHEET_ROW_TEST_ID,
  };

  if (!onPress) return <ListItem {...content} />;
  return <ListItem {...content} isInteractive onPress={() => onPress(entry)} />;
};

const FILTER_OPTIONS: { value: TradeFilter; label: string }[] = [
  // NOTE (spike): placeholder copy — add i18n keys before launch.
  { value: 'all', label: 'All' },
  { value: 'buy', label: 'Buys' },
  { value: 'sell', label: 'Sells' },
];

const isTradeFilter = (value: string): value is TradeFilter =>
  value === 'all' || value === 'buy' || value === 'sell';

/**
 * Bottom sheet listing the trades behind a tapped avatar marker or cluster
 * (ASSETS-4102). A lone avatar shows its single trade; a cluster shows every
 * member's trade, with All / Buys / Sells tabs to disambiguate the group.
 *
 * NOTE (spike): the title and tab labels below are placeholder copy — add
 * dedicated i18n keys before launch.
 */
const SocialMarkersBottomSheet: React.FC<SocialMarkersBottomSheetProps> = ({
  ids,
  byId,
  onClose,
  onTradePress,
}) => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [filter, setFilter] = useState<TradeFilter>('all');
  // Row tapped while the sheet animates closed; handed to `onTradePress` once
  // the close completes so navigation never lands under this Modal.
  const pendingTradeRef = useRef<CandleAvatarMarkerEntry | null>(null);

  // Animate the sheet closed via the ref, then let its onClose unmount us.
  const handleRequestClose = useCallback(
    () => sheetRef.current?.onCloseBottomSheet(),
    [],
  );

  const handleSheetClosed = useCallback(() => {
    const pending = pendingTradeRef.current;
    pendingTradeRef.current = null;
    onClose();
    if (pending) onTradePress?.(pending);
  }, [onClose, onTradePress]);

  const handleRowPress = useCallback((entry: CandleAvatarMarkerEntry) => {
    if (pendingTradeRef.current) return; // already closing for a row tap
    playSelection().catch(() => undefined);
    pendingTradeRef.current = entry;
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleFilterChange = useCallback(
    (value: string) => {
      if (!isTradeFilter(value) || value === filter) return;
      playSelection().catch(() => undefined);
      setFilter(value);
    },
    [filter],
  );

  // Resolve ids → entries (dropping any missing), newest first.
  const entries = useMemo(
    () =>
      ids
        .map((id) => byId[id])
        .filter((entry): entry is CandleAvatarMarkerEntry => Boolean(entry))
        .sort((a, b) => b.trade.timestamp - a.trade.timestamp),
    [ids, byId],
  );

  const visibleEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter((entry) => entry.trade.direction === filter);
  }, [entries, filter]);

  const showTabs = entries.length > 1;
  // Buys / Sells only help when the group mixes both; a one-sided group keeps
  // just "All".
  const filterOptions = useMemo(() => {
    const hasBuys = entries.some((entry) => entry.trade.direction === 'buy');
    const hasSells = entries.some((entry) => entry.trade.direction === 'sell');
    return hasBuys && hasSells
      ? FILTER_OPTIONS
      : FILTER_OPTIONS.filter((option) => option.value === 'all');
  }, [entries]);

  return (
    // The component-library BottomSheet fills its PARENT (absoluteFill), so
    // rendered inline inside the chart box it would be clipped to that box.
    // A transparent full-screen Modal portals it over the whole screen; the
    // GestureHandlerRootView keeps drag-to-dismiss working inside the Modal.
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <GestureHandlerRootView style={tw.style('flex-1')}>
        <BottomSheet
          ref={sheetRef}
          onClose={handleSheetClosed}
          shouldNavigateBack={false}
        >
          {/* NOTE (spike): placeholder title — add an i18n key before launch.
              Pass a Text child (HeaderBase renders non-string children as-is)
              so the title uses HeadingMd (20px / 24px / 600) per the spec,
              not the header's default Compact variant. */}
          <BottomSheetHeader onClose={handleRequestClose}>
            {/* HeadingMd is already 20px / 24px / 600 — no fontWeight needed. */}
            <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
              Trader activity
            </Text>
          </BottomSheetHeader>

          {showTabs && (
            <Box twClassName="px-4 pb-2">
              <FilterButtonGroup
                value={filter}
                onChange={handleFilterChange}
                variant={FilterButtonVariant.Secondary}
                twClassName="gap-2"
              >
                {filterOptions.map((option) => (
                  <FilterButton
                    key={option.value}
                    value={option.value}
                    size={FilterButtonSize.Sm}
                    isSelected={option.value === filter}
                  >
                    {option.label}
                  </FilterButton>
                ))}
              </FilterButtonGroup>
            </Box>
          )}

          <ScrollView
            style={{ maxHeight: MAX_LIST_HEIGHT }}
            nestedScrollEnabled
          >
            {visibleEntries.map((entry, index) => (
              <React.Fragment
                key={`${entry.actor.profileId}-${entry.trade.transactionHash}-${entry.trade.timestamp}`}
              >
                {index > 0 && (
                  <SectionDivider marginVertical={0} twClassName="mx-4" />
                )}
                <TradeRow
                  entry={entry}
                  onPress={onTradePress ? handleRowPress : undefined}
                />
              </React.Fragment>
            ))}
          </ScrollView>
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  );
};

export default SocialMarkersBottomSheet;
