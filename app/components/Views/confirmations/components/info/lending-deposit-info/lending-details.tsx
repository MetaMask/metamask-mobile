import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../../component-library/hooks';
import ContractTag from '../../../../../UI/Stake/components/StakingConfirmation/ContractTag/ContractTag';
import styleSheet from './lending-details.styles';
import { useLendingDepositDetails } from './useLendingDepositDetails';
import InfoSection from '../../UI/info-row/info-section/info-section';
import InfoRow from '../../UI/info-row';
import { selectAvatarAccountType } from '../../../../../../selectors/settings';

const LENDING_DETAILS_TEST_ID = 'lending-details';

const LendingDetails = () => {
  const { styles } = useStyles(styleSheet, {});
  const details = useLendingDepositDetails();
  const avatarAccountType = useSelector(selectAvatarAccountType);

  if (!details) {
    return null;
  }

  const {
    apr,
    annualRewardsFiat,
    annualRewardsToken,
    rewardFrequency,
    withdrawalTime,
    protocol,
    protocolContractAddress,
  } = details;

  return (
    <InfoSection testID={LENDING_DETAILS_TEST_ID}>
      {/* APR */}
      <InfoRow
        label={strings('earn.apr')}
        variant={TextColor.Default}
        tooltip={
          <View style={styles.aprTooltipContentContainer}>
            <Text>{strings('earn.tooltip_content.apr.part_one')}</Text>
            <Text>{strings('earn.tooltip_content.apr.part_two')}</Text>
          </View>
        }
        tooltipTitle={strings('earn.apr')}
        tooltipColor={IconColor.Alternative}
        tooltipIconName={IconName.Question}
      >
        <Text color={TextColor.Success}>{`${apr}%`}</Text>
      </InfoRow>

      {/* Estimated Annual Reward */}
      <InfoRow
        label={strings('stake.estimated_annual_reward')}
        variant={TextColor.Default}
      >
        <View style={styles.estAnnualReward}>
          <Text numberOfLines={1}>{annualRewardsFiat}</Text>
          <Text
            color={TextColor.Alternative}
            numberOfLines={1}
            ellipsizeMode="head"
          >
            {annualRewardsToken}
          </Text>
        </View>
      </InfoRow>

      {/* Reward Frequency */}
      <InfoRow
        label={strings('stake.reward_frequency')}
        variant={TextColor.Default}
        tooltip={strings('earn.tooltip_content.reward_frequency')}
        tooltipTitle={strings('stake.reward_frequency')}
        tooltipColor={IconColor.Alternative}
        tooltipIconName={IconName.Question}
      >
        {rewardFrequency}
      </InfoRow>

      {/* Withdrawal Time */}
      <InfoRow
        label={strings('stake.withdrawal_time')}
        variant={TextColor.Default}
        tooltip={strings('earn.tooltip_content.withdrawal_time')}
        tooltipTitle={strings('stake.withdrawal_time')}
        tooltipColor={IconColor.Alternative}
        tooltipIconName={IconName.Question}
      >
        {withdrawalTime}
      </InfoRow>

      {/* Protocol */}
      <InfoRow
        label={strings('earn.protocol')}
        variant={TextColor.Default}
        tooltip={strings('earn.tooltip_content.protocol')}
        tooltipTitle={strings('earn.protocol')}
        tooltipColor={IconColor.Alternative}
        tooltipIconName={IconName.Question}
      >
        <ContractTag
          contractAddress={protocolContractAddress}
          contractName={protocol}
          avatarAccountType={avatarAccountType}
        />
      </InfoRow>
    </InfoSection>
  );
};

export default LendingDetails;
