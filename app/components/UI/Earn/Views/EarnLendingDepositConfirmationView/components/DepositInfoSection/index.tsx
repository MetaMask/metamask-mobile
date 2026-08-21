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
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../hooks/useStyles';
import useTooltipModal from '../../../../../../hooks/useTooltipModal';
import InfoSection from '../../../../../../Views/confirmations/components/UI/info-row/info-section';
import ContractTag from '../../../../../Stake/components/StakingConfirmation/ContractTag/ContractTag';
import { TokenI } from '../../../../../Tokens/types';
import useEarnToken from '../../../../hooks/useEarnToken';
import styleSheet from './DepositInfoSection.styles';
import { selectAvatarAccountType } from '../../../../../../../selectors/settings';

export const DEPOSIT_DETAILS_SECTION_TEST_ID = 'depositDetailsSection';

const KEY_VALUE_ROW_CLASSNAME = 'h-auto px-0 overflow-hidden';

const KEY_VALUE_ROW_KEY_TEXT_PROPS = {
  color: TextColor.TextDefault,
};

const KEY_VALUE_ROW_VALUE_TEXT_PROPS = {
  fontWeight: FontWeight.Regular,
};

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

  return (
    <InfoSection testID={DEPOSIT_DETAILS_SECTION_TEST_ID}>
      <View style={styles.infoSectionContent}>
        <KeyValueRow
          twClassName={KEY_VALUE_ROW_CLASSNAME}
          keyLabel={strings('earn.apr')}
          keyTextProps={KEY_VALUE_ROW_KEY_TEXT_PROPS}
          keyEndButtonIconProps={{
            size: ButtonIconSize.Xs,
            iconName: IconName.Question,
            accessibilityRole: 'button',
            accessibilityLabel: `${strings('earn.apr')} tooltip`,
            onPress: () =>
              openTooltipModal(
                strings('earn.apr'),
                <View style={styles.aprTooltipContentContainer}>
                  <Text>{strings('earn.tooltip_content.apr.part_one')}</Text>
                  <Text>{strings('earn.tooltip_content.apr.part_two')}</Text>
                </View>,
              ),
          }}
          value={`${earnToken?.experience?.apr}%`}
          valueTextProps={{
            fontWeight: FontWeight.Regular,
            color: TextColor.SuccessDefault,
          }}
        />
        <KeyValueRow
          twClassName={KEY_VALUE_ROW_CLASSNAME}
          keyLabel={strings('stake.estimated_annual_reward')}
          keyTextProps={KEY_VALUE_ROW_KEY_TEXT_PROPS}
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
          twClassName={KEY_VALUE_ROW_CLASSNAME}
          keyLabel={strings('stake.reward_frequency')}
          keyTextProps={KEY_VALUE_ROW_KEY_TEXT_PROPS}
          keyEndButtonIconProps={{
            size: ButtonIconSize.Xs,
            iconName: IconName.Question,
            accessibilityRole: 'button',
            accessibilityLabel: `${strings('stake.reward_frequency')} tooltip`,
            onPress: () =>
              openTooltipModal(
                strings('stake.reward_frequency'),
                strings('earn.tooltip_content.reward_frequency'),
              ),
          }}
          value={strings('earn.every_minute')}
          valueTextProps={KEY_VALUE_ROW_VALUE_TEXT_PROPS}
        />
        <KeyValueRow
          twClassName={KEY_VALUE_ROW_CLASSNAME}
          keyLabel={strings('stake.withdrawal_time')}
          keyTextProps={KEY_VALUE_ROW_KEY_TEXT_PROPS}
          keyEndButtonIconProps={{
            size: ButtonIconSize.Xs,
            iconName: IconName.Question,
            accessibilityRole: 'button',
            accessibilityLabel: `${strings('stake.withdrawal_time')} tooltip`,
            onPress: () =>
              openTooltipModal(
                strings('stake.withdrawal_time'),
                strings('earn.tooltip_content.withdrawal_time'),
              ),
          }}
          value={strings('earn.immediate')}
          valueTextProps={KEY_VALUE_ROW_VALUE_TEXT_PROPS}
        />
        <KeyValueRow
          twClassName={KEY_VALUE_ROW_CLASSNAME}
          keyLabel={strings('earn.protocol')}
          keyTextProps={KEY_VALUE_ROW_KEY_TEXT_PROPS}
          keyEndButtonIconProps={{
            size: ButtonIconSize.Xs,
            iconName: IconName.Question,
            accessibilityRole: 'button',
            accessibilityLabel: `${strings('earn.protocol')} tooltip`,
            onPress: () =>
              openTooltipModal(
                strings('earn.protocol'),
                strings('earn.tooltip_content.protocol'),
              ),
          }}
          value={
            <ContractTag
              contractAddress={lendingContractAddress}
              contractName={lendingProtocol}
              avatarAccountType={avatarAccountType}
            />
          }
        />
      </View>
    </InfoSection>
  );
};

export default DepositInfoSection;
