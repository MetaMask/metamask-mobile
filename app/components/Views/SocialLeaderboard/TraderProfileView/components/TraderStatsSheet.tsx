import React from 'react';
import {
  BottomSheet,
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  EM_DASH,
  formatAbbreviatedUsd,
  formatCount,
  formatPercent,
  formatSignedFullUsdNoDecimals,
} from '../../utils/formatters';
import { formatHoldTime } from '../utils/formatHoldTime';
import {
  getCopytradedCount,
  type TraderProfileWithSheetStats,
} from '../types/traderProfileStatsSheet';
import { TraderStatsSheetSelectorsIDs } from './TraderStatsSheet.testIds';

export interface TraderStatsSheetProps {
  profile: TraderProfileWithSheetStats;
  onClose: () => void;
}

interface StatsSheetRowProps {
  label: string;
  value: string;
  testID: string;
}

const StatsSheetRow: React.FC<StatsSheetRowProps> = ({
  label,
  value,
  testID,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
    twClassName="px-4 py-3"
    testID={testID}
  >
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text variant={TextVariant.BodyMd}>{value}</Text>
  </Box>
);

const TraderStatsSheet: React.FC<TraderStatsSheetProps> = ({
  profile,
  onClose,
}) => {
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const stats = profile.stats;
  const winRate =
    stats.winRate30d != null
      ? formatPercent(stats.winRate30d * 100, {
          showSign: false,
          decimals: 0,
          fallback: EM_DASH,
        })
      : EM_DASH;
  const holdTime =
    stats.medianHoldMinutes != null
      ? formatHoldTime(stats.medianHoldMinutes)
      : EM_DASH;
  const tradeCount =
    stats.tradeCount30d != null ? formatCount(stats.tradeCount30d) : EM_DASH;

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable
      onClose={onClose}
      testID={TraderStatsSheetSelectorsIDs.SHEET}
    >
      <HeaderStandard
        title={strings('social_leaderboard.trader_profile.stats_sheet_title')}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
        closeButtonProps={{
          testID: TraderStatsSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      />
      <StatsSheetRow
        label={strings('social_leaderboard.trader_profile.pnl_30d')}
        value={formatSignedFullUsdNoDecimals(stats.pnl30d)}
        testID={TraderStatsSheetSelectorsIDs.ROW_PNL}
      />
      <StatsSheetRow
        label={strings('social_leaderboard.trader_profile.win_rate')}
        value={winRate}
        testID={TraderStatsSheetSelectorsIDs.ROW_WIN_RATE}
      />
      <StatsSheetRow
        label={strings('social_leaderboard.trader_profile.trading_volume')}
        value={formatAbbreviatedUsd(stats.volumeUsd30d)}
        testID={TraderStatsSheetSelectorsIDs.ROW_VOLUME}
      />
      <StatsSheetRow
        label={strings('social_leaderboard.trader_profile.number_of_trades')}
        value={tradeCount}
        testID={TraderStatsSheetSelectorsIDs.ROW_TRADE_COUNT}
      />
      <StatsSheetRow
        label={strings('social_leaderboard.trader_profile.hold_time')}
        value={holdTime}
        testID={TraderStatsSheetSelectorsIDs.ROW_HOLD_TIME}
      />
      <StatsSheetRow
        label={strings('social_leaderboard.trader_profile.followers')}
        value={formatCount(profile.followerCount)}
        testID={TraderStatsSheetSelectorsIDs.ROW_FOLLOWERS}
      />
      <StatsSheetRow
        label={strings('social_leaderboard.trader_profile.trades_copied')}
        value={formatCount(getCopytradedCount(profile))}
        testID={TraderStatsSheetSelectorsIDs.ROW_TRADES_COPIED}
      />
    </BottomSheet>
  );
};

export default TraderStatsSheet;
