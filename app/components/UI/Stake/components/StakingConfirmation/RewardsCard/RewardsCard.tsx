import React from 'react';
import { View } from 'react-native';
import {
  ButtonIconSize,
  FontWeight,
  IconName,
  KeyValueRow,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../hooks/useStyles';
import Card from '../../../../../../component-library/components/Cards/Card';
import styleSheet from './RewardsCard.styles';
import { RewardsCardProps } from './RewardsCard.types';
import { createTooltipOpenedEvent } from '../../../utils/metaMetrics/tooltipMetaMetricsUtils';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import useTooltipModal from '../../../../../hooks/useTooltipModal';

const RewardsCard = ({
  rewardRate,
  rewardsEth,
  rewardsFiat,
}: RewardsCardProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent } = useAnalytics();
  const { openTooltipModal } = useTooltipModal();

  const rewardRateTitle = strings('tooltip_modal.reward_rate.title');
  const rewardFrequencyTitle = strings('tooltip_modal.reward_frequency.title');

  return (
    <Card style={styles.card} disabled>
      <KeyValueRow
        keyLabel={rewardRateTitle}
        value={rewardRate}
        valueTextProps={{
          variant: TextVariant.BodyMd,
          fontWeight: FontWeight.Regular,
          color: TextColor.SuccessDefault,
        }}
        keyEndButtonIconProps={{
          size: ButtonIconSize.Sm,
          iconName: IconName.Question,
          accessibilityRole: 'button',
          accessibilityLabel: `${rewardRateTitle} tooltip`,
          onPress: () => {
            openTooltipModal(
              rewardRateTitle,
              strings('tooltip_modal.reward_rate.tooltip'),
            );
            trackEvent(createTooltipOpenedEvent('Rewards Card', 'Reward Rate'));
          },
        }}
      />
      <KeyValueRow
        keyLabel={strings('stake.estimated_annual_rewards')}
        value={
          <View style={styles.estAnnualRewardValue}>
            <Text color={TextColor.TextAlternative}>{rewardsFiat}</Text>
            <Text>{rewardsEth}</Text>
          </View>
        }
      />
      <KeyValueRow
        keyLabel={rewardFrequencyTitle}
        value={strings('stake.12_hours')}
        valueTextProps={{
          variant: TextVariant.BodyMd,
          fontWeight: FontWeight.Regular,
        }}
        keyEndButtonIconProps={{
          size: ButtonIconSize.Sm,
          iconName: IconName.Question,
          accessibilityRole: 'button',
          accessibilityLabel: `${rewardFrequencyTitle} tooltip`,
          onPress: () => {
            openTooltipModal(
              rewardFrequencyTitle,
              strings('tooltip_modal.reward_frequency.tooltip'),
            );
            trackEvent(
              createTooltipOpenedEvent('Rewards Card', 'Reward Frequency'),
            );
          },
        }}
      />
    </Card>
  );
};

export default RewardsCard;
