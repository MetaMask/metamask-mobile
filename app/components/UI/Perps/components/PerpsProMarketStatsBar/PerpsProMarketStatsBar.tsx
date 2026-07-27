import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  KeyValueColumn,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { PerpsProMarketViewSelectorsIDs } from '../../Perps.testIds';
import { FUNDING_RATE_CONFIG } from '../../constants/perpsConfig';
import { usePerpsLivePrices } from '../../hooks/stream';
import { usePerpsMarketStats } from '../../hooks/usePerpsMarketStats';
import { formatFundingRate } from '../../utils/formatUtils';
import FundingCountdown from '../FundingCountdown';
import { createStyles } from './PerpsProMarketStatsBar.styles';
import type { PerpsProMarketStatsBarProps } from './PerpsProMarketStatsBar.types';

/**
 * Pro-mode market stats bar.
 *
 * Renders funding rate (with countdown), 24h volume, open interest and 24h
 * high/low as a horizontally scrollable row of key/value items, sitting
 * between the chart and the order-form/order-book columns.
 *
 * Data comes from `usePerpsMarketStats` (same hook that backs the lite
 * `PerpsMarketStatisticsCard`), plus a live funding-rate subscription that
 * mirrors the card's WebSocket-first / stats fallback behaviour. No lite
 * behaviour or shared components are changed by this component.
 */
const PerpsProMarketStatsBar: React.FC<PerpsProMarketStatsBarProps> = ({
  symbol,
  nextFundingTime,
  fundingIntervalHours,
  testID = PerpsProMarketViewSelectorsIDs.STATS_BAR,
}) => {
  const { styles } = useStyles(createStyles, {});
  const marketStats = usePerpsMarketStats(symbol);

  // Live funding rate, throttled to match PerpsMarketStatisticsCard.
  const livePrices = usePerpsLivePrices({
    symbols: symbol ? [symbol] : [],
    throttleMs: 2000,
  });
  const liveFunding = symbol ? livePrices[symbol]?.funding : undefined;

  // Prefer the live WebSocket funding value, fall back to the stats hook, then
  // to the zero display — identical precedence to PerpsMarketStatisticsCard.
  const fundingRateData = useMemo(() => {
    let fundingValue: number;
    let displayText: string;

    if (liveFunding !== undefined) {
      fundingValue = liveFunding;
      displayText = formatFundingRate(liveFunding);
    } else if (
      marketStats.fundingRate &&
      marketStats.fundingRate !== FUNDING_RATE_CONFIG.ZeroDisplay
    ) {
      fundingValue =
        parseFloat(marketStats.fundingRate.replace('%', '')) /
        FUNDING_RATE_CONFIG.PercentageMultiplier;
      displayText = marketStats.fundingRate;
    } else {
      fundingValue = 0;
      displayText = FUNDING_RATE_CONFIG.ZeroDisplay;
    }

    return {
      displayText,
      color:
        fundingValue >= 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault,
    };
  }, [liveFunding, marketStats.fundingRate]);

  const fundingValueContent = useMemo(
    () => (
      <View style={styles.fundingValue}>
        <Text variant={TextVariant.BodyMd} color={fundingRateData.color}>
          {fundingRateData.displayText}
        </Text>
        <FundingCountdown
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
          testID={PerpsProMarketViewSelectorsIDs.STATS_BAR_FUNDING_COUNTDOWN}
        />
      </View>
    ),
    [
      fundingRateData,
      nextFundingTime,
      fundingIntervalHours,
      styles.fundingValue,
    ],
  );

  return (
    <Box testID={testID} twClassName="border-t border-b border-border-muted">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID={PerpsProMarketViewSelectorsIDs.STATS_BAR_SCROLL}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="px-4 py-2 gap-6"
        >
          <KeyValueColumn
            style={styles.item}
            keyLabel={strings('perps.market.funding_rate')}
            value={fundingValueContent}
            testID={PerpsProMarketViewSelectorsIDs.STATS_BAR_FUNDING_RATE}
          />
          <KeyValueColumn
            style={styles.item}
            keyLabel={strings('perps.market.24h_volume')}
            value={marketStats.volume24h}
            testID={PerpsProMarketViewSelectorsIDs.STATS_BAR_VOLUME}
          />
          <KeyValueColumn
            style={styles.item}
            keyLabel={strings('perps.market.open_interest')}
            value={marketStats.openInterest}
            testID={PerpsProMarketViewSelectorsIDs.STATS_BAR_OPEN_INTEREST}
          />
          <KeyValueColumn
            style={styles.item}
            keyLabel={strings('perps.market.24h_high')}
            value={marketStats.high24h}
            testID={PerpsProMarketViewSelectorsIDs.STATS_BAR_HIGH}
          />
          <KeyValueColumn
            style={styles.item}
            keyLabel={strings('perps.market.24h_low')}
            value={marketStats.low24h}
            testID={PerpsProMarketViewSelectorsIDs.STATS_BAR_LOW}
          />
        </Box>
      </ScrollView>
    </Box>
  );
};

export default PerpsProMarketStatsBar;
