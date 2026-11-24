import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, Pressable } from 'react-native';
// Gesture-handler ScrollView cooperates with the sheet's drag-to-dismiss pan;
// the plain RN ScrollView loses vertical drags to it and can't scroll.
import {
  GestureHandlerRootView,
  ScrollView,
} from 'react-native-gesture-handler';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BottomSheet, {
  type BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
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
}

/**
 * Trader avatar with a buy(+)/sell(-) intent badge. Uses the shared
 * `BadgeWrapper` (circular anchor) so the badge is pinned to the avatar's
 * bottom-right edge consistently with the rest of the app, rather than
 * hand-positioned.
 */
const AvatarWithIntent: React.FC<{
  entry: CandleAvatarMarkerEntry;
  isBuy: boolean;
}> = ({ entry, isBuy }) => {
  const { actor } = entry;
  return (
    <BadgeWrapper
      // anchorElementShape defaults to Circular (the enum is type-only in the
      // barrel, so it can't be referenced as a runtime value here).
      badgePosition={BadgePosition.BottomRight}
      anchorSize={{ width: ROW_AVATAR_SIZE, height: ROW_AVATAR_SIZE }}
      badgeElement={
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName={`h-4 w-4 rounded-full border-2 border-background-default ${
            isBuy ? 'bg-success-default' : 'bg-error-default'
          }`}
        >
          {/* Icon (centered SVG) avoids the baseline/font-padding offset a
              single +/- text glyph gets. Mirrors PositionSheetChart's marker. */}
          <Icon
            name={isBuy ? IconName.Add : IconName.Minus}
            size={IconSize.Xs}
            color={IconColor.PrimaryInverse}
          />
        </Box>
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

/** Colored Buy / Sell pill shown beside the trader name. */
const DirectionPill: React.FC<{ isBuy: boolean }> = ({ isBuy }) => (
  <Box
    twClassName={`shrink-0 rounded px-1.5 py-0.5 ${
      isBuy ? 'bg-success-muted' : 'bg-error-muted'
    }`}
  >
    {/* NOTE (spike): placeholder copy — add Buy/Sell i18n keys before launch. */}
    <Text
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Medium}
      color={isBuy ? TextColor.SuccessDefault : TextColor.ErrorDefault}
    >
      {isBuy ? 'Buy' : 'Sell'}
    </Text>
  </Box>
);

/** One trade row: trader avatar (+/-), name + Buy/Sell pill, value + size. */
const TradeRow: React.FC<{ entry: CandleAvatarMarkerEntry }> = ({ entry }) => {
  const { actor, trade, position } = entry;
  const isBuy = trade.direction === 'buy';
  const unitPrice =
    trade.tokenAmount > 0 ? trade.usdCost / trade.tokenAmount : null;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
      twClassName="px-4 py-3"
    >
      <AvatarWithIntent entry={entry} isBuy={isBuy} />
      <Box twClassName="flex-1 min-w-0">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
            twClassName="shrink min-w-0"
          >
            {actor.name}
          </Text>
          <DirectionPill isBuy={isBuy} />
        </Box>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {formatTradeDate(trade.timestamp)}
        </Text>
      </Box>
      <Box alignItems={BoxAlignItems.End}>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {formatAbbreviatedUsd(trade.usdCost)}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {`${formatTokenAmount(trade.tokenAmount)} ${position.tokenSymbol}${
            unitPrice != null ? ` at ${formatTradeUnitPrice(unitPrice)}` : ''
          }`}
        </Text>
      </Box>
    </Box>
  );
};

/** One filter tab (All / Buys / Sells). */
const FilterTab: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
}> = ({ label, active, onPress }) => {
  const tw = useTailwind();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={tw.style(
        'px-3 py-1.5 rounded-full',
        active ? 'bg-primary-default' : 'bg-muted',
      )}
    >
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={active ? TextColor.PrimaryInverse : TextColor.TextAlternative}
      >
        {label}
      </Text>
    </Pressable>
  );
};

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
}) => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [filter, setFilter] = useState<TradeFilter>('all');

  // Animate the sheet closed via the ref, then let its onClose unmount us.
  const handleRequestClose = useCallback(
    () => sheetRef.current?.onCloseBottomSheet(),
    [],
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
          onClose={onClose}
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
            <Box
              flexDirection={BoxFlexDirection.Row}
              justifyContent={BoxJustifyContent.Start}
              gap={2}
              twClassName="px-4 pb-2"
            >
              <FilterTab
                label="All"
                active={filter === 'all'}
                onPress={() => setFilter('all')}
              />
              <FilterTab
                label="Buys"
                active={filter === 'buy'}
                onPress={() => setFilter('buy')}
              />
              <FilterTab
                label="Sells"
                active={filter === 'sell'}
                onPress={() => setFilter('sell')}
              />
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
                {index > 0 && <Box twClassName="h-px bg-muted mx-4" />}
                <TradeRow entry={entry} />
              </React.Fragment>
            ))}
          </ScrollView>
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  );
};

export default SocialMarkersBottomSheet;
