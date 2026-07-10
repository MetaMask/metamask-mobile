import React, { useMemo } from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
  KeyValueColumn,
  Tag,
  TagSeverity,
  Text as DSText,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor as CLTextColor,
  TextVariant as CLTextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './PerpsMarketStatisticsCard.styles';
import type { PerpsMarketStatisticsCardProps } from './PerpsMarketStatisticsCard.types';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsOrderBookViewSelectorsIDs,
} from '../../Perps.testIds';
import FundingCountdown from '../FundingCountdown';
import { usePerpsLivePrices } from '../../hooks/stream';
import {
  formatFundingRate,
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { FUNDING_RATE_CONFIG } from '../../constants/perpsConfig';

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

  const livePrices = usePerpsLivePrices({
    symbols: symbol ? [symbol] : [],
    throttleMs: 2000,
  });

  const liveFunding = symbol ? livePrices[symbol]?.funding : undefined;
  const liveOraclePrice = symbol ? livePrices[symbol]?.markPrice : undefined;

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

    const color =
      fundingValue >= 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault;

    return {
      value: fundingValue,
      displayText,
      color,
    };
  }, [liveFunding, marketStats.fundingRate]);

  const fundingValueContent = useMemo(
    () => (
      <View style={styles.fundingRateContainer}>
        <DSText variant={TextVariant.BodyMd} color={fundingRateData.color}>
          {fundingRateData.displayText}
        </DSText>
        <FundingCountdown
          variant={CLTextVariant.BodySM}
          color={CLTextColor.Alternative}
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

  const oraclePriceContent = useMemo(
    () => (
      <DSText
        variant={TextVariant.BodyMd}
        color={TextColor.TextDefault}
        testID={PerpsMarketDetailsViewSelectorsIDs.STATISTICS_ORACLE_PRICE}
      >
        {liveOraclePrice
          ? formatPerpsFiat(parseFloat(liveOraclePrice), {
              ranges: PRICE_RANGES_UNIVERSAL,
            })
          : '-'}
      </DSText>
    ),
    [liveOraclePrice],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant={CLTextVariant.HeadingMD} color={CLTextColor.Default}>
          {strings('perps.market.stats')}
        </Text>
        {dexName && (
          <Tag severity={TagSeverity.Neutral}>{dexName.toUpperCase()}</Tag>
        )}
      </View>

      <View style={styles.statisticsGrid}>
        <View style={styles.statisticsRow}>
          <KeyValueColumn
            style={styles.statisticsItem}
            keyLabel={strings('perps.market.24h_volume')}
            value={marketStats.volume24h}
          />
          <KeyValueColumn
            style={styles.statisticsItem}
            keyLabel={strings('perps.market.open_interest')}
            keyEndButtonIconProps={{
              iconName: IconName.Info,
              onPress: () => onTooltipPress('open_interest'),
              testID:
                PerpsMarketDetailsViewSelectorsIDs.OPEN_INTEREST_INFO_ICON,
            }}
            value={marketStats.openInterest}
          />
        </View>

        <View style={styles.statisticsRow}>
          <KeyValueColumn
            style={styles.statisticsItem}
            keyLabel={strings('perps.market.funding_rate')}
            keyEndButtonIconProps={{
              iconName: IconName.Info,
              onPress: () => onTooltipPress('funding_rate'),
              testID: PerpsMarketDetailsViewSelectorsIDs.FUNDING_RATE_INFO_ICON,
            }}
            value={fundingValueContent}
          />
          <KeyValueColumn
            style={styles.statisticsItem}
            keyLabel={strings('perps.market.oracle_price')}
            keyEndButtonIconProps={{
              iconName: IconName.Info,
              onPress: () => onTooltipPress('oracle_price'),
              testID: 'perps-market-details-oracle-price-info-icon',
            }}
            value={oraclePriceContent}
          />
        </View>
      </View>

      {onOrderBookPress && (
        <Button
          variant={ButtonVariant.Secondary}
          isFullWidth
          size={ButtonSize.Lg}
          onPress={onOrderBookPress}
          testID={PerpsOrderBookViewSelectorsIDs.CONTAINER}
        >
          {strings('perps.market.order_book')}
        </Button>
      )}
    </View>
  );
};

export default PerpsMarketStatisticsCard;
