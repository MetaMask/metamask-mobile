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
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './PerpsMarketStatisticsCard.styles';
import type { PerpsMarketStatisticsCardProps } from './PerpsMarketStatisticsCard.types';
import { PerpsMarketDetailsViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import FundingCountdown from '../FundingCountdown';
import { usePerpsLivePrices } from '../../hooks/stream';
import { formatFundingRate } from '../../utils/formatUtils';
import { FUNDING_RATE_CONFIG } from '../../constants/perpsConfig';

const PerpsMarketStatisticsCard: React.FC<PerpsMarketStatisticsCardProps> = ({
  symbol,
  marketStats,
  onTooltipPress,
  nextFundingTime,
  fundingIntervalHours,
}) => {
  const { styles } = useStyles(styleSheet, {});

  // Subscribe to live price updates including funding rate
  const livePrices = usePerpsLivePrices({
    symbols: symbol ? [symbol] : [],
    throttleMs: 2000, // Update every 2 seconds for funding rate
  });

  // Get live funding rate from WebSocket subscription
  const liveFunding = symbol ? livePrices[symbol]?.funding : undefined;

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

  return (
    <View style={styles.statisticsGrid}>
      {/* Row 1: 24hr High/Low */}
      <View style={styles.statisticsRow}>
        <View
          style={styles.statisticsItem}
          testID={PerpsMarketDetailsViewSelectorsIDs.STATISTICS_LOW_24H}
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {strings('perps.market.24hr_low')}
          </Text>
          <Text style={styles.statisticsValue} color={TextColor.Default}>
            {marketStats.low24h}
          </Text>
        </View>
        <View
          style={styles.statisticsItem}
          testID={PerpsMarketDetailsViewSelectorsIDs.STATISTICS_HIGH_24H}
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {strings('perps.market.24hr_high')}
          </Text>
          <Text style={styles.statisticsValue} color={TextColor.Default}>
            {marketStats.high24h}
          </Text>
        </View>
      </View>

      {/* Row 2: Volume and Open Interest */}
      <View style={styles.statisticsRow}>
        <View
          style={styles.statisticsItem}
          testID={PerpsMarketDetailsViewSelectorsIDs.STATISTICS_VOLUME_24H}
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {strings('perps.market.24h_volume')}
          </Text>
          <Text style={styles.statisticsValue} color={TextColor.Default}>
            {marketStats.volume24h}
          </Text>
        </View>
        <View
          style={styles.statisticsItem}
          testID={PerpsMarketDetailsViewSelectorsIDs.STATISTICS_OPEN_INTEREST}
        >
          <View style={styles.statisticsLabelContainer}>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {strings('perps.market.open_interest')}
            </Text>
            <TouchableOpacity onPress={() => onTooltipPress('open_interest')}>
              <Icon
                name={IconName.Info}
                size={IconSize.Sm}
                color={IconColor.Muted}
                testID={
                  PerpsMarketDetailsViewSelectorsIDs.OPEN_INTEREST_INFO_ICON
                }
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.statisticsValue} color={TextColor.Default}>
            {marketStats.openInterest}
          </Text>
        </View>
      </View>

      {/* Row 3: Funding Rate */}
      <View style={styles.statisticsRow}>
        <View
          style={styles.statisticsItem}
          testID={PerpsMarketDetailsViewSelectorsIDs.STATISTICS_FUNDING_RATE}
        >
          <View style={styles.statisticsLabelContainer}>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {strings('perps.market.funding_rate')}
            </Text>
            <TouchableOpacity onPress={() => onTooltipPress('funding_rate')}>
              <Icon
                name={IconName.Info}
                size={IconSize.Sm}
                color={IconColor.Muted}
                testID={
                  PerpsMarketDetailsViewSelectorsIDs.FUNDING_RATE_INFO_ICON
                }
              />
            </TouchableOpacity>
          </View>
          <View style={styles.fundingRateContainer}>
            <Text style={styles.statisticsValue} color={fundingRateData.color}>
              {fundingRateData.displayText}
            </Text>
            <FundingCountdown
              variant={TextVariant.BodyXS}
              color={TextColor.Alternative}
              style={styles.fundingCountdown}
              nextFundingTime={nextFundingTime}
              fundingIntervalHours={fundingIntervalHours}
              testID={
                PerpsMarketDetailsViewSelectorsIDs.STATISTICS_FUNDING_COUNTDOWN
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default PerpsMarketStatisticsCard;
