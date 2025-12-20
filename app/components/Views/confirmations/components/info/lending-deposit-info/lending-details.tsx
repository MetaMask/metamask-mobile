import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import KeyValueRow, {
  TooltipSizes,
} from '../../../../../../component-library/components-temp/KeyValueRow';
import ContractTag from '../../../../../UI/Stake/components/StakingConfirmation/ContractTag/ContractTag';
import styleSheet from './lending-details.styles';
import { useLendingDepositDetails } from './useLendingDepositDetails';
import InfoSection from '../../UI/info-row/info-section/info-section';
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
      <View style={styles.infoSectionContent}>
        {/* APR */}
        <KeyValueRow
          field={{
            label: {
              text: strings('earn.apr'),
              variant: TextVariant.BodyMDMedium,
            },
            tooltip: {
              title: strings('earn.apr'),
              content: (
                <View style={styles.aprTooltipContentContainer}>
                  <Text>{strings('earn.tooltip_content.apr.part_one')}</Text>
                  <Text>{strings('earn.tooltip_content.apr.part_two')}</Text>
                </View>
              ),
              size: TooltipSizes.Sm,
            },
          }}
          value={{
            label: {
              text: `${apr}%`,
              variant: TextVariant.BodyMD,
              color: TextColor.Success,
            },
          }}
        />

        {/* Estimated Annual Reward */}
        <KeyValueRow
          field={{
            label: {
              text: strings('stake.estimated_annual_reward'),
            },
          }}
          value={{
            label: (
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
            ),
          }}
        />

        {/* Reward Frequency */}
        <KeyValueRow
          field={{
            label: {
              text: strings('stake.reward_frequency'),
            },
            tooltip: {
              title: strings('stake.reward_frequency'),
              content: strings('earn.tooltip_content.reward_frequency'),
              size: TooltipSizes.Sm,
            },
          }}
          value={{
            label: {
              text: rewardFrequency,
              variant: TextVariant.BodyMD,
            },
          }}
        />

        {/* Withdrawal Time */}
        <KeyValueRow
          field={{
            label: {
              text: strings('stake.withdrawal_time'),
            },
            tooltip: {
              title: strings('stake.withdrawal_time'),
              content: strings('earn.tooltip_content.withdrawal_time'),
              size: TooltipSizes.Sm,
            },
          }}
          value={{
            label: {
              text: withdrawalTime,
              variant: TextVariant.BodyMD,
            },
          }}
        />

        {/* Protocol */}
        <KeyValueRow
          field={{
            label: {
              text: strings('earn.protocol'),
            },
            tooltip: {
              title: strings('earn.protocol'),
              content: strings('earn.tooltip_content.protocol'),
              size: TooltipSizes.Sm,
            },
          }}
          value={{
            label: (
              <ContractTag
                contractAddress={protocolContractAddress}
                contractName={protocol}
                avatarAccountType={avatarAccountType}
              />
            ),
          }}
        />
      </View>
    </InfoSection>
  );
};

export default LendingDetails;
