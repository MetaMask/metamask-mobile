import React from 'react';
import { View } from 'react-native';
import {
  ButtonIconSize,
  Card,
  FontWeight,
  IconName,
  KeyValueRow,
  Text,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './RewardsCard.styles';
import { RewardsCardProps } from './RewardsCard.types';
import { createTooltipOpenedEvent } from '../../../utils/metaMetrics/tooltipMetaMetricsUtils';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import useTooltipModal from '../../../../../hooks/useTooltipModal';

const KEY_VALUE_ROW_CLASSNAME = 'h-auto px-0 overflow-hidden';

const KEY_VALUE_ROW_KEY_TEXT_PROPS = {
  color: TextColor.TextDefault,
};

const KEY_VALUE_ROW_VALUE_TEXT_PROPS = {
  fontWeight: FontWeight.Regular,
};

const RewardsCard = ({
  rewardRate,
  rewardsEth,
  rewardsFiat,
}: RewardsCardProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent } = useAnalytics();
  const { openTooltipModal } = useTooltipModal();

  return (
    <Card accessible style={styles.card}>
      <KeyValueRow
        twClassName={KEY_VALUE_ROW_CLASSNAME}
        keyLabel={strings('tooltip_modal.reward_rate.title')}
        keyTextProps={KEY_VALUE_ROW_KEY_TEXT_PROPS}
        keyEndButtonIconProps={{
          size: ButtonIconSize.Xs,
          iconName: IconName.Question,
          accessibilityRole: 'button',
          accessibilityLabel: `${strings(
            'tooltip_modal.reward_rate.title',
          )} tooltip`,
          onPress: () => {
            openTooltipModal(
              strings('tooltip_modal.reward_rate.title'),
              strings('tooltip_modal.reward_rate.tooltip'),
            );
            trackEvent(createTooltipOpenedEvent('Rewards Card', 'Reward Rate'));
          },
        }}
        value={rewardRate}
        valueTextProps={{
          color: TextColor.SuccessDefault,
          fontWeight: FontWeight.Regular,
        }}
      />
      <KeyValueRow
        twClassName={KEY_VALUE_ROW_CLASSNAME}
        keyLabel={strings('stake.estimated_annual_rewards')}
        keyTextProps={KEY_VALUE_ROW_KEY_TEXT_PROPS}
        value={
          <View style={styles.estAnnualRewardValue}>
            <Text color={TextColor.TextAlternative}>{rewardsFiat}</Text>
            <Text>{rewardsEth}</Text>
          </View>
        }
      />
      <KeyValueRow
        twClassName={KEY_VALUE_ROW_CLASSNAME}
        keyLabel={strings('tooltip_modal.reward_frequency.title')}
        keyTextProps={KEY_VALUE_ROW_KEY_TEXT_PROPS}
        keyEndButtonIconProps={{
          size: ButtonIconSize.Xs,
          iconName: IconName.Question,
          accessibilityRole: 'button',
          accessibilityLabel: `${strings(
            'tooltip_modal.reward_frequency.title',
          )} tooltip`,
          onPress: () => {
            openTooltipModal(
              strings('tooltip_modal.reward_frequency.title'),
              strings('tooltip_modal.reward_frequency.tooltip'),
            );
            trackEvent(
              createTooltipOpenedEvent('Rewards Card', 'Reward Frequency'),
            );
          },
        }}
        value={strings('stake.12_hours')}
        valueTextProps={KEY_VALUE_ROW_VALUE_TEXT_PROPS}
      />
    </Card>
  );
};

export default RewardsCard;
