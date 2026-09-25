import React from 'react';
import {
  BottomSheet,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../../Homepage/Sections/TopTraders/components/TraderAvatar';
import {
  getCopytradedCount,
  type TraderProfileWithSheetStats,
} from '../types/traderProfileStatsSheet';
import {
  formatSheetAbbreviatedUsd,
  formatSheetCount,
  formatSheetHoldFromMinutes,
  formatSheetUnsignedUsd,
  formatSheetWinRate,
  prefixFakeStat,
  type StatsSheetFallbackFields,
} from './statsSheetFormatters';
import { TraderStatsSheetSelectorsIDs } from './TraderStatsSheet.testIds';

const SHEET_AVATAR_SIZE = 32;

export interface TraderStatsSheetProps {
  profile: TraderProfileWithSheetStats;
  /** Shown as `@handle` in the sheet header when set (e.g. owner profile). */
  profileHandle?: string | null;
  /**
   * Avatar already rendered by the host screen (e.g. owner `ProfileAvatar`).
   * When omitted, falls back to `TraderAvatar` from the profile image URL.
   */
  headerAvatar?: React.ReactNode;
  /** Prefix `*` on values that still come from local mock data. */
  fallbackFields?: StatsSheetFallbackFields;
  /** Hide median hold time (My Profile). Other traders still show it. */
  hideHoldTime?: boolean;
  /** Open position count from the owner's wallet perps cache. */
  openPositionsCount?: number;
  onClose: () => void;
}

interface GridMetricProps {
  label: string;
  value: string;
  testID: string;
}

const GridMetric: React.FC<GridMetricProps> = ({ label, value, testID }) => (
  <Box twClassName="flex-1" testID={testID}>
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      numberOfLines={1}
    >
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      twClassName="mt-1"
      numberOfLines={1}
    >
      {value}
    </Text>
  </Box>
);

interface ListRowProps {
  label: string;
  value: string;
  testID: string;
}

const ListRow: React.FC<ListRowProps> = ({ label, value, testID }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="py-3"
    testID={testID}
  >
    <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
      {label}
    </Text>
    <Text variant={TextVariant.BodyMd}>{value}</Text>
  </Box>
);

function resolveSheetHandle(
  profile: TraderProfileWithSheetStats,
  profileHandle?: string | null,
): string {
  const raw =
    profileHandle?.replace(/^@/u, '') ??
    profile.socialHandles?.twitter?.replace(/^@/u, '') ??
    profile.profile.name.replace(/\s+/gu, '-').toLowerCase();
  return `@${raw}`;
}

const TraderStatsSheet: React.FC<TraderStatsSheetProps> = ({
  profile,
  profileHandle,
  headerAvatar,
  fallbackFields,
  hideHoldTime = false,
  openPositionsCount,
  onClose,
}) => {
  const sheetRef = React.useRef<BottomSheetRef>(null);

  React.useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  const stats = profile.stats;
  const pnlDisplay = prefixFakeStat(
    formatSheetUnsignedUsd(stats.pnl30d),
    fallbackFields?.pnl === true,
  );
  const isPnlPositive = stats.pnl30d != null && stats.pnl30d >= 0;
  const hasPnl = stats.pnl30d != null;
  const winRate = prefixFakeStat(
    formatSheetWinRate(stats.winRate30d),
    fallbackFields?.winRate === true,
  );
  const volume = prefixFakeStat(
    formatSheetAbbreviatedUsd(stats.volumeUsd30d),
    fallbackFields?.volume === true,
  );
  const holdTime = prefixFakeStat(
    formatSheetHoldFromMinutes(stats.medianHoldMinutes),
    fallbackFields?.holdTime === true,
  );
  const tradeCount = prefixFakeStat(
    formatSheetCount(stats.tradeCount30d ?? null),
    fallbackFields?.tradeCount === true,
  );
  const copyCount = profile.copytradedAllTime
    ? prefixFakeStat(
        formatSheetCount(getCopytradedCount(profile)),
        fallbackFields?.timesCopied === true,
      )
    : '';

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable
      onClose={onClose}
      testID={TraderStatsSheetSelectorsIDs.SHEET}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 pt-2 pb-4"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
          twClassName="flex-1 min-w-0"
        >
          {headerAvatar ?? (
            <TraderAvatar
              imageUrl={profile.profile.imageUrl}
              address={profile.profile.address}
              size={SHEET_AVATAR_SIZE}
              recyclingKey={profile.profile.profileId}
              testID={TraderStatsSheetSelectorsIDs.HEADER_AVATAR}
            />
          )}
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
            testID={TraderStatsSheetSelectorsIDs.HEADER_HANDLE}
          >
            {resolveSheetHandle(profile, profileHandle)}
          </Text>
        </Box>
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          onPress={handleClose}
          testID={TraderStatsSheetSelectorsIDs.CLOSE_BUTTON}
        />
      </Box>

      <Box
        twClassName="px-4 pb-6"
        testID={TraderStatsSheetSelectorsIDs.ROW_PNL}
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('social_leaderboard.trader_profile.pnl_30d')}
        </Text>
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          twClassName={
            hasPnl
              ? isPnlPositive
                ? 'text-success-default mt-1'
                : 'text-error-default mt-1'
              : 'mt-1'
          }
          color={hasPnl ? undefined : TextColor.TextDefault}
          testID={TraderStatsSheetSelectorsIDs.HERO_PNL}
        >
          {pnlDisplay}
        </Text>
      </Box>

      <Box flexDirection={BoxFlexDirection.Row} gap={6} twClassName="px-4 pb-6">
        <GridMetric
          label={strings('social_leaderboard.trader_profile.win_rate')}
          value={winRate}
          testID={TraderStatsSheetSelectorsIDs.ROW_WIN_RATE}
        />
        <GridMetric
          label={strings('social_leaderboard.trader_profile.trading_volume')}
          value={volume}
          testID={TraderStatsSheetSelectorsIDs.ROW_VOLUME}
        />
      </Box>

      <Box flexDirection={BoxFlexDirection.Row} gap={6} twClassName="px-4 pb-6">
        {hideHoldTime ? null : (
          <GridMetric
            label={strings(
              'social_leaderboard.trader_profile.stats_sheet_hold_time',
            )}
            value={holdTime}
            testID={TraderStatsSheetSelectorsIDs.ROW_HOLD_TIME}
          />
        )}
        <GridMetric
          label={strings('social_leaderboard.trader_profile.number_of_trades')}
          value={tradeCount}
          testID={TraderStatsSheetSelectorsIDs.ROW_TRADE_COUNT}
        />
      </Box>

      <Box
        twClassName="px-4 pb-2"
        testID={TraderStatsSheetSelectorsIDs.SECTION_BREAKDOWN}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('social_leaderboard.trader_profile.stats_sheet_breakdown')}
        </Text>
        <ListRow
          label={strings(
            'social_leaderboard.trader_profile.stats_sheet_profile_age',
          )}
          value=""
          testID={TraderStatsSheetSelectorsIDs.ROW_PROFILE_AGE}
        />
        <ListRow
          label={strings(
            'social_leaderboard.trader_profile.stats_sheet_positions',
          )}
          value={
            openPositionsCount != null
              ? formatSheetCount(openPositionsCount)
              : ''
          }
          testID={TraderStatsSheetSelectorsIDs.ROW_POSITIONS}
        />
        <ListRow
          label={strings(
            'social_leaderboard.trader_profile.stats_sheet_avg_position_value',
          )}
          value=""
          testID={TraderStatsSheetSelectorsIDs.ROW_AVG_POSITION_VALUE}
        />
        <ListRow
          label={strings(
            'social_leaderboard.trader_profile.stats_sheet_avg_30d_sample',
          )}
          value=""
          testID={TraderStatsSheetSelectorsIDs.ROW_AVG_30D_SAMPLE}
        />
      </Box>

      <Box
        twClassName="px-4 pb-6"
        testID={TraderStatsSheetSelectorsIDs.SECTION_PERFORMANCE}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('social_leaderboard.trader_profile.stats_sheet_performance')}
        </Text>
        <ListRow
          label={strings('social_leaderboard.trader_profile.followers')}
          value={formatSheetCount(profile.followerCount)}
          testID={TraderStatsSheetSelectorsIDs.ROW_FOLLOWERS}
        />
        <ListRow
          label={strings('social_leaderboard.trader_profile.trades_copied')}
          value={copyCount}
          testID={TraderStatsSheetSelectorsIDs.ROW_TRADES_COPIED}
        />
        <ListRow
          label={strings(
            'social_leaderboard.trader_profile.stats_sheet_copy_success_rate',
          )}
          value=""
          testID={TraderStatsSheetSelectorsIDs.ROW_COPY_SUCCESS_RATE}
        />
      </Box>
    </BottomSheet>
  );
};

export default TraderStatsSheet;
