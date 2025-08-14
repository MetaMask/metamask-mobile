import React from 'react';
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
// TODO: Consider renaming to PerpsMarketStatisticsCard since it isn't tied to a specific view anymore
import { PerpsMarketDetailsViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

const PerpsMarketStatisticsCard: React.FC<PerpsMarketStatisticsCardProps> = ({
  marketStats,
  onTooltipPress,
}) => {
  const { styles } = useStyles(styleSheet, {});

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
            <Text
              style={styles.statisticsValue}
              color={
                parseFloat(marketStats.fundingRate) >= 0
                  ? TextColor.Success
                  : TextColor.Error
              }
            >
              {marketStats.fundingRate}
            </Text>
            <Text
              variant={TextVariant.BodyXS}
              color={TextColor.Alternative}
              style={styles.fundingCountdown}
              testID={
                PerpsMarketDetailsViewSelectorsIDs.STATISTICS_FUNDING_COUNTDOWN
              }
            >
              ({marketStats.fundingCountdown})
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default PerpsMarketStatisticsCard;
