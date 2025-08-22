import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../../locales/i18n';
import KeyValueRow, {
  TooltipSizes,
} from '../../../../../../../component-library/components-temp/KeyValueRow';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../hooks/useStyles';
import InfoSection from '../../../../../../Views/confirmations/components/UI/info-row/info-section';
import ContractTag from '../../../../../Stake/components/StakingConfirmation/ContractTag/ContractTag';
import { TokenI } from '../../../../../Tokens/types';
import useEarnToken from '../../../../hooks/useEarnToken';
import styleSheet from './DepositInfoSection.styles';
import { selectAvatarStyle } from '../../../../../../../selectors/settings';

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

  const avatarStyle = useSelector(selectAvatarStyle);

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
              text: `${earnToken?.experience?.apr}%`,
              variant: TextVariant.BodyMD,
              color: TextColor.Success,
            },
          }}
        />
        <KeyValueRow
          field={{
            label: {
              text: strings('stake.estimated_annual_reward'),
            },
          }}
          value={{
            label: (
              <View style={styles.estAnnualReward}>
                <Text numberOfLines={1}>
                  {
                    estimatedAnnualRewardsForAmount?.estimatedAnnualRewardsFormatted
                  }
                </Text>
                <Text
                  color={TextColor.Alternative}
                  numberOfLines={1}
                  ellipsizeMode="head"
                >
                  {
                    estimatedAnnualRewardsForAmount?.estimatedAnnualRewardsTokenFormatted
                  }
                </Text>
              </View>
            ),
          }}
        />
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
              text: strings('earn.every_minute'),
              variant: TextVariant.BodyMD,
            },
          }}
        />
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
              text: strings('earn.immediate'),
              variant: TextVariant.BodyMD,
            },
          }}
        />
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
                contractAddress={lendingContractAddress}
                contractName={lendingProtocol}
                avatarStyle={avatarStyle}
              />
            ),
          }}
        />
      </View>
    </InfoSection>
  );
};

export default DepositInfoSection;
