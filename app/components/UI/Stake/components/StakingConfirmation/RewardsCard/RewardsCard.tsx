import React from 'react';
import { View } from 'react-native';
import {
  Card,
  FontWeight,
  KeyValueRow,
  Text,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './RewardsCard.styles';
import { RewardsCardProps } from './RewardsCard.types';
import {
  KEY_VALUE_ROW_CLASSNAME,
  KEY_VALUE_ROW_KEY_TEXT_PROPS,
  KEY_VALUE_ROW_VALUE_TEXT_PROPS,
  useKeyValueRowTooltip,
} from '../keyValueRow';

const RewardsCard = ({
  rewardRate,
  rewardsEth,
  rewardsFiat,
}: RewardsCardProps) => {
  const { styles } = useStyles(styleSheet, {});
  const tooltipProps = useKeyValueRowTooltip();

  return (
    <Card accessible style={styles.card}>
      <KeyValueRow
        twClassName={KEY_VALUE_ROW_CLASSNAME}
        keyLabel={strings('tooltip_modal.reward_rate.title')}
        keyTextProps={KEY_VALUE_ROW_KEY_TEXT_PROPS}
        keyEndButtonIconProps={tooltipProps(
          strings('tooltip_modal.reward_rate.title'),
          strings('tooltip_modal.reward_rate.tooltip'),
          'Rewards Card',
          'Reward Rate',
        )}
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
        keyEndButtonIconProps={tooltipProps(
          strings('tooltip_modal.reward_frequency.title'),
          strings('tooltip_modal.reward_frequency.tooltip'),
          'Rewards Card',
          'Reward Frequency',
        )}
        value={strings('stake.12_hours')}
        valueTextProps={KEY_VALUE_ROW_VALUE_TEXT_PROPS}
      />
    </Card>
  );
};

export default RewardsCard;
