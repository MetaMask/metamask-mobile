import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  ButtonIconSize,
  FontWeight,
  IconName,
  KeyValueRow,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../hooks/useStyles';
import InfoSection from '../../../../../../Views/confirmations/components/UI/info-row/info-section';
import ContractTag from '../../../../../Stake/components/StakingConfirmation/ContractTag/ContractTag';
import { TokenI } from '../../../../../Tokens/types';
import useEarnToken from '../../../../hooks/useEarnToken';
import styleSheet from './DepositInfoSection.styles';
import { selectAvatarAccountType } from '../../../../../../../selectors/settings';
import useTooltipModal from '../../../../../../hooks/useTooltipModal';

export const DEPOSIT_DETAILS_SECTION_TEST_ID = 'depositDetailsSection';

export interface DepositInfoSectionProps {
  token: TokenI;
  lendingContractAddress: string;
  lendingProtocol: string;
  amountTokenMinimalUnit: string;
  amountFiatNumber: number;
}

const DepositInfoSection = ({
  token,
  lendingContractAddress,
  lendingProtocol,
  amountTokenMinimalUnit,
  amountFiatNumber,
}: DepositInfoSectionProps) => {
  const { styles } = useStyles(styleSheet, {});

  const avatarAccountType = useSelector(selectAvatarAccountType);

  const { openTooltipModal } = useTooltipModal();

  const { earnToken, getEstimatedAnnualRewardsForAmount } = useEarnToken(token);

  if (!earnToken) return null;

  const estimatedAnnualRewardsForAmount = getEstimatedAnnualRewardsForAmount(
    earnToken,
    amountTokenMinimalUnit,
    amountFiatNumber,
  );

  const aprTitle = strings('earn.apr');
  const rewardFrequencyTitle = strings('stake.reward_frequency');
  const withdrawalTimeTitle = strings('stake.withdrawal_time');
  const protocolTitle = strings('earn.protocol');

  return (
    <InfoSection testID={DEPOSIT_DETAILS_SECTION_TEST_ID}>
      <View style={styles.infoSectionContent}>
        <KeyValueRow
          keyLabel={aprTitle}
          value={`${earnToken?.experience?.apr}%`}
          valueTextProps={{
            variant: TextVariant.BodyMd,
            fontWeight: FontWeight.Regular,
            color: TextColor.SuccessDefault,
          }}
          keyEndButtonIconProps={{
            size: ButtonIconSize.Sm,
            iconName: IconName.Question,
            accessibilityRole: 'button',
            accessibilityLabel: `${aprTitle} tooltip`,
            onPress: () =>
              openTooltipModal(
                aprTitle,
                <View style={styles.aprTooltipContentContainer}>
                  <Text>{strings('earn.tooltip_content.apr.part_one')}</Text>
                  <Text>{strings('earn.tooltip_content.apr.part_two')}</Text>
                </View>,
              ),
          }}
        />
        <KeyValueRow
          keyLabel={strings('stake.estimated_annual_reward')}
          value={
            <View style={styles.estAnnualReward}>
              <Text numberOfLines={1}>
                {
                  estimatedAnnualRewardsForAmount?.estimatedAnnualRewardsFormatted
                }
              </Text>
              <Text
                color={TextColor.TextAlternative}
                numberOfLines={1}
                ellipsizeMode="head"
              >
                {
                  estimatedAnnualRewardsForAmount?.estimatedAnnualRewardsTokenFormatted
                }
              </Text>
            </View>
          }
        />
        <KeyValueRow
          keyLabel={rewardFrequencyTitle}
          value={strings('earn.every_minute')}
          valueTextProps={{
            variant: TextVariant.BodyMd,
            fontWeight: FontWeight.Regular,
          }}
          keyEndButtonIconProps={{
            size: ButtonIconSize.Sm,
            iconName: IconName.Question,
            accessibilityRole: 'button',
            accessibilityLabel: `${rewardFrequencyTitle} tooltip`,
            onPress: () =>
              openTooltipModal(
                rewardFrequencyTitle,
                strings('earn.tooltip_content.reward_frequency'),
              ),
          }}
        />
        <KeyValueRow
          keyLabel={withdrawalTimeTitle}
          value={strings('earn.immediate')}
          valueTextProps={{
            variant: TextVariant.BodyMd,
            fontWeight: FontWeight.Regular,
          }}
          keyEndButtonIconProps={{
            size: ButtonIconSize.Sm,
            iconName: IconName.Question,
            accessibilityRole: 'button',
            accessibilityLabel: `${withdrawalTimeTitle} tooltip`,
            onPress: () =>
              openTooltipModal(
                withdrawalTimeTitle,
                strings('earn.tooltip_content.withdrawal_time'),
              ),
          }}
        />
        <KeyValueRow
          keyLabel={protocolTitle}
          value={
            <ContractTag
              contractAddress={lendingContractAddress}
              contractName={lendingProtocol}
              avatarAccountType={avatarAccountType}
            />
          }
          keyEndButtonIconProps={{
            size: ButtonIconSize.Sm,
            iconName: IconName.Question,
            accessibilityRole: 'button',
            accessibilityLabel: `${protocolTitle} tooltip`,
            onPress: () =>
              openTooltipModal(
                protocolTitle,
                strings('earn.tooltip_content.protocol'),
              ),
          }}
        />
      </View>
    </InfoSection>
  );
};

export default DepositInfoSection;
