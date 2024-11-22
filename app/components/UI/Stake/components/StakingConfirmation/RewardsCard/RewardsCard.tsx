import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import KeyValueRow, {
  TooltipSizes,
} from '../../../../../../component-library/components-temp/KeyValueRow';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import Card from '../../../../../../component-library/components/Cards/Card';
import styleSheet from './RewardsCard.styles';
import { RewardsCardProps } from './RewardsCard.types';
import { createTooltipOpenedEvent } from '../../../utils/metaMetrics/tooltipMetaMetricsUtils';
import { useMetrics } from '../../../../../hooks/useMetrics';

const RewardsCard = ({
  rewardRate,
  rewardsEth,
  rewardsFiat,
}: RewardsCardProps) => {
  const { styles } = useStyles(styleSheet, {});

  const { trackEvent } = useMetrics();

  return (
    <Card style={styles.card} disabled>
      <KeyValueRow
        field={{
          label: { text: strings('tooltip_modal.reward_rate.title') },
          tooltip: {
            title: strings('tooltip_modal.reward_rate.title'),
            content: strings('tooltip_modal.reward_rate.tooltip'),
            size: TooltipSizes.Sm,
            onPress: () =>
              trackEvent(
                createTooltipOpenedEvent('Rewards Card', 'Reward Rate'),
              ),
          },
        }}
        value={{
          label: {
            text: rewardRate,
            color: TextColor.Success,
            variant: TextVariant.BodyMD,
          },
        }}
      />
      <KeyValueRow
        field={{ label: { text: strings('stake.estimated_annual_rewards') } }}
        value={{
          label: (
            <View style={styles.estAnnualRewardValue}>
              <Text color={TextColor.Alternative}>{rewardsFiat}</Text>
              <Text>{rewardsEth}</Text>
            </View>
          ),
        }}
      />
      <KeyValueRow
        field={{
          label: { text: strings('tooltip_modal.reward_frequency.title') },
          tooltip: {
            title: strings('tooltip_modal.reward_frequency.title'),
            content: strings('tooltip_modal.reward_frequency.tooltip'),
            size: TooltipSizes.Sm,
            onPress: () =>
              trackEvent(
                createTooltipOpenedEvent('Rewards Card', 'Reward Frequency'),
              ),
          },
        }}
        value={{
          label: {
            text: strings('stake.12_hours'),
            variant: TextVariant.BodyMD,
          },
        }}
      />
    </Card>
  );
};

export default RewardsCard;
