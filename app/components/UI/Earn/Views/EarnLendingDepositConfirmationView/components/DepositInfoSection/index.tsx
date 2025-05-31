import React from 'react';
import styleSheet from './DepositInfoSection.styles';
import { useStyles } from '../../../../../../hooks/useStyles';
import InfoSection from '../../../../../../Views/confirmations/components/UI/info-row/info-section';
import { View } from 'react-native';
import KeyValueRow, {
  TooltipSizes,
} from '../../../../../../../component-library/components-temp/KeyValueRow';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import ContractTag from '../../../../../Stake/components/StakingConfirmation/ContractTag/ContractTag';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../../reducers';
import { TokenI } from '../../../../../Tokens/types';
import { useEarnTokenDetails } from '../../../../hooks/useEarnTokenDetails';
import { strings } from '../../../../../../../../locales/i18n';

export const DEPOSIT_DETAILS_SECTION_TEST_ID = 'depositDetailsSection';

export interface DepositInfoSectionProps {
  token: TokenI;
  lendingContractAddress: string;
  lendingProtocol: string;
}

// TODO: Replace mock data with actual values before launch
export const MOCK_DATA_TO_REPLACE = {
  EST_ANNUAL_REWARD: {
    FIAT: '$5.00',
    TOKEN: '5 DAI',
  },
  REWARD_FREQUENCY: strings('earn.every_minute'),
  WITHDRAWAL_TIME: strings('earn.immediate'),
};

const DepositInfoSection = ({
  token,
  lendingContractAddress,
  lendingProtocol,
}: DepositInfoSectionProps) => {
  const { styles } = useStyles(styleSheet, {});

  const useBlockieIcon = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  );

  const { getTokenWithBalanceAndApr } = useEarnTokenDetails();
  const earnToken = getTokenWithBalanceAndApr(token);

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
              text: `${earnToken.apr}%`,
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
                <Text>{MOCK_DATA_TO_REPLACE.EST_ANNUAL_REWARD.FIAT}</Text>
                <Text color={TextColor.Alternative}>
                  {MOCK_DATA_TO_REPLACE.EST_ANNUAL_REWARD.TOKEN}
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
              text: MOCK_DATA_TO_REPLACE.REWARD_FREQUENCY,
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
              text: MOCK_DATA_TO_REPLACE.WITHDRAWAL_TIME,
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
                useBlockieIcon={useBlockieIcon}
              />
            ),
          }}
        />
      </View>
    </InfoSection>
  );
};

export default DepositInfoSection;
