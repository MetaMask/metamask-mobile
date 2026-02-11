import React from 'react';
import { View } from 'react-native';
import { ConfirmationRowComponentIDs } from '../../../../ConfirmationView.testIds';
import { strings } from '../../../../../../../../locales/i18n';
import { TOOLTIP_TYPES } from '../../../../../../../core/Analytics/events/confirmations';
import Text from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import { useStakingDetails } from '../../hooks/useStakingDetails';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import InfoRow from '../../../../components/UI/info-row';
import InfoSection from '../../../../components/UI/info-row/info-section';
import styleSheet from './staking-details.styles';

const StakingDetails = () => {
  const { styles } = useStyles(styleSheet, {});
  const { apr, annualRewardsFiat, annualRewardsETH } = useStakingDetails();
  const { trackTooltipClickedEvent } = useConfirmationMetricEvents();

  const handleRewardFreqTooltipClickedEvent = () => {
    trackTooltipClickedEvent({
      tooltip: TOOLTIP_TYPES.REWARD_FREQUENCY,
    });
  };

  return (
    <InfoSection testID={ConfirmationRowComponentIDs.STAKING_DETAILS}>
      <InfoRow label={strings('stake.apr')}>{apr}</InfoRow>
      <InfoRow label={strings('stake.estimated_annual_reward')}>
        <View style={styles.valueContainer}>
          <Text style={styles.secondaryValue}>{annualRewardsFiat}</Text>
          <Text style={styles.primaryValue}>{annualRewardsETH}</Text>
        </View>
      </InfoRow>
      <InfoRow
        label={strings('stake.reward_frequency')}
        tooltip={strings('stake.reward_frequency_tooltip', {
          frequency: strings('stake.12_hours'),
        })}
        onTooltipPress={handleRewardFreqTooltipClickedEvent}
      >
        {strings('stake.12_hours')}
      </InfoRow>
      <InfoRow label={strings('stake.withdrawal_time')}>
        {strings('stake.estimated_unstaking_time')}
      </InfoRow>
    </InfoSection>
  );
};

export default StakingDetails;
