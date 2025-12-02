import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './PerpsMarketStatisticsCard.styles';
import type { PerpsMarketStatisticsCardProps } from './PerpsMarketStatisticsCard.types';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsOrderBookViewSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import FundingCountdown from '../FundingCountdown';
import { usePerpsLivePrices } from '../../hooks/stream';
import {
  formatFundingRate,
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { FUNDING_RATE_CONFIG } from '../../constants/perpsConfig';
import Tag from '../../../../../component-library/components/Tags/Tag';

const PerpsMarketStatisticsCard: React.FC<PerpsMarketStatisticsCardProps> = ({
  symbol,
  marketStats,
  onTooltipPress,
  nextFundingTime,
  fundingIntervalHours,
  dexName,
  onOrderBookPress,
}) => {
  const { styles } = useStyles(styleSheet, {});

  // Subscribe to live price updates including funding rate
  const livePrices = usePerpsLivePrices({
    symbols: symbol ? [symbol] : [],
    throttleMs: 2000, // Update every 2 seconds for funding rate
  });

  // Get live funding rate and oracle price from WebSocket subscription
  const liveFunding = symbol ? livePrices[symbol]?.funding : undefined;
  // Use markPrice (oracle/mark price) for oracle price display, not price (mid price)
  const liveOraclePrice = symbol ? livePrices[symbol]?.markPrice : undefined;

  // Compute funding rate value and display once
  const fundingRateData = useMemo(() => {
    // Determine the actual funding value to use
    let fundingValue: number;
    let displayText: string;

    if (liveFunding !== undefined) {
      // Use live funding if available
      fundingValue = liveFunding;
      displayText = formatFundingRate(liveFunding);
    } else if (
      marketStats.fundingRate &&
      marketStats.fundingRate !== FUNDING_RATE_CONFIG.ZERO_DISPLAY
    ) {
      // Fall back to marketStats if no live data
      fundingValue =
        parseFloat(marketStats.fundingRate.replace('%', '')) /
        FUNDING_RATE_CONFIG.PERCENTAGE_MULTIPLIER;
      displayText = marketStats.fundingRate;
    } else {
      // Default to zero
      fundingValue = 0;
      displayText = FUNDING_RATE_CONFIG.ZERO_DISPLAY;
    }

    // Determine color based on value
    const color = fundingValue >= 0 ? TextColor.Success : TextColor.Error;

    return {
      value: fundingValue,
      displayText,
      color,
    };
  }, [liveFunding, marketStats.fundingRate]);

  // Render funding rate value with countdown
  const fundingValueContent = useMemo(
    () => (
      <View style={styles.fundingRateContainer}>
        <Text variant={TextVariant.BodyMD} color={fundingRateData.color}>
          {fundingRateData.displayText}
        </Text>
        <FundingCountdown
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.fundingCountdown}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
          testID={
            PerpsMarketDetailsViewSelectorsIDs.STATISTICS_FUNDING_COUNTDOWN
          }
        />
      </View>
    ),
    [
      fundingRateData,
      nextFundingTime,
      fundingIntervalHours,
      styles.fundingRateContainer,
      styles.fundingCountdown,
    ],
  );

  return (
    <View style={styles.container}>
      {/* Header with title and DEX badge */}
      <View style={styles.header}>
        <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
          {strings('perps.market.stats')}
        </Text>
        {dexName && <Tag label={dexName.toUpperCase()} style={styles.dexTag} />}
      </View>

      {/* Stats rows with card background */}
      <View style={styles.statsRowsContainer}>
        {/* Order Book - Clickable row */}
        {onOrderBookPress && (
          <TouchableOpacity
            style={[styles.orderBookRow, styles.statsRowFirst]}
            onPress={onOrderBookPress}
            testID={PerpsOrderBookViewSelectorsIDs.CONTAINER}
          >
            <View style={styles.orderBookRowContent}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.market.order_book')}
              </Text>
            </View>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Sm}
              color={IconColor.Alternative}
            />
          </TouchableOpacity>
        )}

        {/* 24h volume */}
        <KeyValueRow
          field={{
            label: {
              text: strings('perps.market.24h_volume'),
              variant: TextVariant.BodyMD,
              color: TextColor.Alternative,
            },
          }}
          value={{
            label: {
              text: marketStats.volume24h,
              variant: TextVariant.BodyMD,
              color: TextColor.Default,
            },
          }}
          style={[styles.statsRow, !onOrderBookPress && styles.statsRowFirst]}
        />

        {/* Open interest with tooltip */}
        <KeyValueRow
          field={{
            label: (
              <View style={styles.labelWithIcon}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('perps.market.open_interest')}
                </Text>
                <TouchableOpacity
                  onPress={() => onTooltipPress('open_interest')}
                  testID="perps-market-details-open-interest-info-icon"
                >
                  <Icon
                    name={IconName.Info}
                    size={IconSize.Sm}
                    color={IconColor.Alternative}
                  />
                </TouchableOpacity>
              </View>
            ),
          }}
          value={{
            label: {
              text: marketStats.openInterest,
              variant: TextVariant.BodyMD,
              color: TextColor.Default,
            },
          }}
          style={styles.statsRow}
        />

        {/* Funding rate with tooltip and countdown */}
        <KeyValueRow
          field={{
            label: (
              <View style={styles.labelWithIcon}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('perps.market.funding_rate')}
                </Text>
                <TouchableOpacity
                  onPress={() => onTooltipPress('funding_rate')}
                  testID="perps-market-details-funding-rate-info-icon"
                >
                  <Icon
                    name={IconName.Info}
                    size={IconSize.Sm}
                    color={IconColor.Alternative}
                  />
                </TouchableOpacity>
              </View>
            ),
          }}
          value={{
            label: fundingValueContent,
          }}
          style={styles.statsRow}
        />

        {/* Oracle price (markPrice) - last row without bottom border */}
        <KeyValueRow
          field={{
            label: (
              <View style={styles.labelWithIcon}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('perps.market.oracle_price')}
                </Text>
                <TouchableOpacity
                  onPress={() => onTooltipPress('oracle_price')}
                  testID="perps-market-details-oracle-price-info-icon"
                >
                  <Icon
                    name={IconName.Info}
                    size={IconSize.Sm}
                    color={IconColor.Alternative}
                  />
                </TouchableOpacity>
              </View>
            ),
          }}
          value={{
            label: {
              text: liveOraclePrice
                ? formatPerpsFiat(parseFloat(liveOraclePrice), {
                    ranges: PRICE_RANGES_UNIVERSAL,
                  })
                : '-',
              variant: TextVariant.BodyMD,
              color: TextColor.Default,
            },
          }}
          style={styles.statsRowLast}
        />
      </View>
    </View>
  );
};

export default PerpsMarketStatisticsCard;
