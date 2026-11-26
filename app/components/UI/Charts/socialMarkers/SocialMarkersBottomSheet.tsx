import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
// Gesture-handler ScrollView cooperates with the sheet's drag-to-dismiss pan.
import { ScrollView } from 'react-native-gesture-handler';
import {
  BadgeIcon,
  BadgeWrapper,
  BadgeWrapperPosition,
  BottomSheet,
  BottomSheetHeader,
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
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useParams } from '../../../../util/navigation/navUtils';
import { playSelection } from '../../../../util/haptics';
import { SocialEvent } from '../../../Views/SocialLeaderboard/analytics/socialEvents';
import TraderAvatar from '../../SocialFeed/components/TraderAvatar';
import {
  formatAbbreviatedUsd,
  formatTokenAmount,
  formatTradeDate,
  formatTradeUnitPrice,
} from '../../SocialFeed/utils/formatters';
import type { CandleAvatarMarkerEntry } from './mapFollowingPositionsToCandleAvatarMarkers';
import type { SocialMarkersBottomSheetParams } from './SocialMarkersBottomSheet.types';

/** Avatar diameter for a row. */
const ROW_AVATAR_SIZE = 36;
/** Cap the scroll area so a large cluster doesn't swallow the screen. */
const MAX_LIST_HEIGHT = 360;

type TradeFilter = 'all' | 'buy' | 'sell';

export const SocialMarkersBottomSheetTestIds = {
  CONTAINER: 'social-markers-sheet',
  CLOSE_BUTTON: 'social-markers-sheet-close-button',
  ROW: 'social-markers-sheet-row',
} as const;

const getEntryKey = ({ actor, trade }: CandleAvatarMarkerEntry) =>
  `${actor.profileId}-${trade.transactionHash}-${trade.timestamp}`;

/** Trader avatar with a buy(+)/sell(-) intent badge. */
const AvatarWithIntent = ({
  entry,
  isBuy,
}: {
  entry: CandleAvatarMarkerEntry;
  isBuy: boolean;
}) => (
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
      imageUrl={entry.actor.imageUrl}
      address={entry.actor.address}
      profileId={entry.actor.profileId}
      size={ROW_AVATAR_SIZE}
    />
  </BadgeWrapper>
);

/**
 * One trade: avatar (+/-), name + Buy/Sell tag, date on the left; value and
 * size on the right. Opens the trader's position sheet on press.
 */
const TradeRow = ({
  entry,
  onPress,
}: {
  entry: CandleAvatarMarkerEntry;
  onPress: (entry: CandleAvatarMarkerEntry) => void;
}) => {
  const { actor, trade, position } = entry;
  const isBuy = trade.direction === 'buy';
  const amount = `${formatTokenAmount(trade.tokenAmount)} ${position.tokenSymbol}`;
  const subvalue =
    trade.tokenAmount > 0
      ? strings('social_leaderboard.chart_markers_sheet.amount_at_price', {
          amount,
          price: formatTradeUnitPrice(trade.usdCost / trade.tokenAmount),
        })
      : amount;
  const handlePress = useCallback(() => onPress(entry), [onPress, entry]);

  return (
    <ListItem
      isInteractive
      onPress={handlePress}
      startAccessory={<AvatarWithIntent entry={entry} isBuy={isBuy} />}
      accessoryGap={3}
      title={
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextDefault}
          numberOfLines={1}
          twClassName="shrink min-w-0 font-medium"
        >
          {actor.name}
        </Text>
      }
      titleEndAccessory={
        <Tag
          severity={isBuy ? TagSeverity.Success : TagSeverity.Danger}
          twClassName="shrink-0"
        >
          {strings(
            isBuy
              ? 'social_leaderboard.chart_markers_sheet.buy'
              : 'social_leaderboard.chart_markers_sheet.sell',
          )}
        </Tag>
      }
      description={formatTradeDate(trade.timestamp)}
      value={
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextDefault}
          twClassName="font-medium"
        >
          {formatAbbreviatedUsd(trade.usdCost)}
        </Text>
      }
      subvalue={subvalue}
      testID={SocialMarkersBottomSheetTestIds.ROW}
    />
  );
};

const FILTER_OPTIONS: { value: TradeFilter; labelKey: string }[] = [
  {
    value: 'all',
    labelKey: 'social_leaderboard.chart_markers_sheet.filter_all',
  },
  {
    value: 'buy',
    labelKey: 'social_leaderboard.chart_markers_sheet.filter_buys',
  },
  {
    value: 'sell',
    labelKey: 'social_leaderboard.chart_markers_sheet.filter_sells',
  },
];

const isTradeFilter = (value: string): value is TradeFilter =>
  FILTER_OPTIONS.some((option) => option.value === value);

/**
 * Route `Routes.SOCIAL.CHART_MARKERS_SHEET` (ASSETS-4102): the trades behind a
 * tapped avatar marker or cluster on the token details candlestick chart. A
 * cluster that mixes buys and sells gets All / Buys / Sells filters.
 *
 * A row pushes the position sheet on top of this one; its back button pops
 * back here (this sheet stays mounted underneath in the native stack).
 */
const SocialMarkersBottomSheet = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { entries: unsortedEntries } =
    useParams<SocialMarkersBottomSheetParams>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [filter, setFilter] = useState<TradeFilter>('all');

  const entries = useMemo(
    () =>
      [...(unsortedEntries ?? [])].sort(
        (a, b) => b.trade.timestamp - a.trade.timestamp,
      ),
    [unsortedEntries],
  );

  const visibleEntries = useMemo(
    () =>
      filter === 'all'
        ? entries
        : entries.filter((entry) => entry.trade.direction === filter),
    [entries, filter],
  );

  // Clusters get filters; Buys / Sells only when the group mixes both, else
  // just "All".
  const filterOptions = useMemo(() => {
    if (entries.length < 2) return [];
    const hasBuys = entries.some((entry) => entry.trade.direction === 'buy');
    const hasSells = entries.some((entry) => entry.trade.direction === 'sell');
    return hasBuys && hasSells
      ? FILTER_OPTIONS
      : FILTER_OPTIONS.filter((option) => option.value === 'all');
  }, [entries]);

  const handleClose = useCallback(() => {
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

  const handleRowPress = useCallback(
    ({ actor, position }: CandleAvatarMarkerEntry) => {
      playSelection().catch(() => undefined);
      navigation.navigate(Routes.SOCIAL.POSITION_SHEET, {
        positionId: position.positionId,
        position,
        author: {
          id: actor.profileId,
          username: actor.name,
          address: actor.address,
          avatarUri: actor.imageUrl ?? null,
          // Not on the followed-by-me actor; the sheet omits the badge.
          winRatePercent: null,
        },
        // followed-by-me only returns open positions.
        isClosed: false,
        // Not streamed here, so the sheet refetches the position on open.
        isSnapshotLive: false,
        analyticsSource: SocialEvent.Source.TOKEN_DETAILS_CHART,
        showBackButton: true,
      });
    },
    [navigation],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      testID={SocialMarkersBottomSheetTestIds.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: SocialMarkersBottomSheetTestIds.CLOSE_BUTTON,
        }}
      >
        {strings('social_leaderboard.chart_markers_sheet.title')}
      </BottomSheetHeader>

      {filterOptions.length > 0 && (
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
                {strings(option.labelKey)}
              </FilterButton>
            ))}
          </FilterButtonGroup>
        </Box>
      )}

      <ScrollView style={{ maxHeight: MAX_LIST_HEIGHT }}>
        {visibleEntries.map((entry, index) => (
          <React.Fragment key={getEntryKey(entry)}>
            {index > 0 && (
              <SectionDivider marginVertical={0} twClassName="mx-4" />
            )}
            <TradeRow entry={entry} onPress={handleRowPress} />
          </React.Fragment>
        ))}
      </ScrollView>
    </BottomSheet>
  );
};

export default SocialMarkersBottomSheet;
