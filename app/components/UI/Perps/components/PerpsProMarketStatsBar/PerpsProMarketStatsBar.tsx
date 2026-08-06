import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { calculateFundingCountdown } from '@metamask/perps-controller';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { PerpsProMarketViewSelectorsIDs } from '../../Perps.testIds';
import { FUNDING_RATE_CONFIG } from '../../constants/perpsConfig';
import { usePerpsLivePrices } from '../../hooks/stream';
import { usePerpsMarketStats } from '../../hooks/usePerpsMarketStats';
import {
  formatFundingRate,
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { createStyles } from './PerpsProMarketStatsBar.styles';
import type { PerpsProMarketStatsBarProps } from './PerpsProMarketStatsBar.types';

interface StatItemProps {
  label: string;
  value: string;
  valueColor?: TextColor;
  testID?: string;
  valueTestID?: string;
}

/**
 * Compact inline label+value pair matching Figma "KeyValue/Base".
 *
 * MMDS KeyValueRow forces full-width padding and a fixed height, which is wrong
 * for this dense horizontal stats strip — so we compose Text directly with the
 * Figma typography (BodyMd Regular label / BodyMd Medium value) and gap-2.
 */
const StatItem: React.FC<StatItemProps> = ({
  label,
  value,
  valueColor,
  testID,
  valueTestID,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="gap-2"
    testID={testID}
  >
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Regular}
      color={TextColor.TextAlternative}
      numberOfLines={1}
    >
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={valueColor ?? TextColor.TextDefault}
      numberOfLines={1}
      testID={valueTestID}
    >
      {value}
    </Text>
  </Box>
);

const formatLivePrice = (rawPrice: string | undefined): string => {
  if (!rawPrice) {
    return '-';
  }
  const parsed = Number.parseFloat(rawPrice);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return '-';
  }
  return formatPerpsFiat(parsed, { ranges: PRICE_RANGES_UNIVERSAL });
};

/**
 * Pro-mode market stats bar.
 *
 * Renders Funding, 24h vol, Open interest, Mark price and Oracle price as a
 * horizontally scrollable row of inline key/value items (Figma 10041:12992),
 * sitting between the chart and the order-form/order-book columns.
 *
 * Volume/OI come from `usePerpsMarketStats`; funding, mark and oracle come from
 * the live price stream (same sources as the lite statistics card). No lite
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

  // Live funding + mark/oracle, throttled to match PerpsMarketStatisticsCard.
  const livePrices = usePerpsLivePrices({
    symbols: symbol ? [symbol] : [],
    throttleMs: 2000,
  });
  const livePriceUpdate = symbol ? livePrices[symbol] : undefined;
  const liveFunding = livePriceUpdate?.funding;

  // Prefer the live WebSocket funding value, fall back to the stats hook, then
  // to the zero display — identical precedence to PerpsMarketStatisticsCard.
  const fundingRateDisplay = useMemo(() => {
    if (liveFunding !== undefined) {
      return formatFundingRate(liveFunding);
    }
    if (
      marketStats.fundingRate &&
      marketStats.fundingRate !== FUNDING_RATE_CONFIG.ZeroDisplay
    ) {
      return marketStats.fundingRate;
    }
    return FUNDING_RATE_CONFIG.ZeroDisplay;
  }, [liveFunding, marketStats.fundingRate]);

  // Funding countdown — same calculator as FundingCountdown, formatted as
  // "rate / HH:MM:SS" to match the Figma value (not the parenthesized lite form).
  const [fundingCountdown, setFundingCountdown] = useState(() =>
    calculateFundingCountdown({ nextFundingTime, fundingIntervalHours }),
  );

  useEffect(() => {
    const updateCountdown = () => {
      setFundingCountdown(
        calculateFundingCountdown({ nextFundingTime, fundingIntervalHours }),
      );
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextFundingTime, fundingIntervalHours]);

  const fundingValue = `${fundingRateDisplay} / ${fundingCountdown}`;

  const fundingValueColor: TextColor = useMemo(() => {
    if (liveFunding === undefined) return TextColor.TextDefault;
    if (liveFunding > 0) return TextColor.SuccessDefault;
    if (liveFunding < 0) return TextColor.ErrorDefault;
    return TextColor.TextDefault;
  }, [liveFunding]);

  // PriceUpdate exposes a single markPrice field. Lite's statistics card uses
  // it as "Oracle price"; Pro Figma shows both Mark and Oracle, so both read
  // markPrice until a distinct oraclePx is streamed.
  const markPriceDisplay = formatLivePrice(livePriceUpdate?.markPrice);
  const oraclePriceDisplay = formatLivePrice(livePriceUpdate?.markPrice);

  return (
    <Box testID={testID} twClassName="border-t border-b border-border-muted">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID={PerpsProMarketViewSelectorsIDs.STATS_BAR_SCROLL}
      >
        {/* Figma: px-4 py-2 gap-4 between KeyValue/Base items */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="px-4 py-2 gap-4"
        >
          <StatItem
            label={strings('perps.market.funding')}
            value={fundingValue}
            valueColor={fundingValueColor}
            testID={PerpsProMarketViewSelectorsIDs.STATS_BAR_FUNDING_RATE}
            valueTestID={
              PerpsProMarketViewSelectorsIDs.STATS_BAR_FUNDING_COUNTDOWN
            }
          />
          <StatItem
            label={strings('perps.market.24h_vol')}
            value={marketStats.volume24h}
            testID={PerpsProMarketViewSelectorsIDs.STATS_BAR_VOLUME}
          />
          <StatItem
            label={strings('perps.market.open_interest')}
            value={marketStats.openInterest}
            testID={PerpsProMarketViewSelectorsIDs.STATS_BAR_OPEN_INTEREST}
          />
          <StatItem
            label={strings('perps.market.mark_price')}
            value={markPriceDisplay}
            testID={PerpsProMarketViewSelectorsIDs.STATS_BAR_MARK_PRICE}
          />
          <StatItem
            label={strings('perps.market.oracle_price')}
            value={oraclePriceDisplay}
            testID={PerpsProMarketViewSelectorsIDs.STATS_BAR_ORACLE_PRICE}
          />
        </Box>
      </ScrollView>
    </Box>
  );
};

export default PerpsProMarketStatsBar;
