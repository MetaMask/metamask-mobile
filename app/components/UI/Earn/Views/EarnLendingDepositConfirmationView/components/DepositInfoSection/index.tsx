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

export const STABLECOIN_DEPOSIT_TEST_IDS = {
  DEPOSIT_DETAILS_SECTION: 'depositDetailsSection',
};

interface DepositInfoSection {
  token: TokenI;
  lendingContractAddress: string;
  lendingProtocol: string;
}

// TODO: Replace mock data with actual values before launch
const MOCK_DATA_TO_REPLACE = {
  EST_ANNUAL_REWARD: {
    FIAT: '$5.00',
    TOKEN: '5 DAI',
  },
  REWARD_FREQUENCY: strings('earn.daily'),
  WITHDRAWAL_TIME: strings('earn.immediate'),
};

const DepositInfoSection = ({
  token,
  lendingContractAddress,
  lendingProtocol,
}: DepositInfoSection) => {
  const { styles } = useStyles(styleSheet, {});

  const useBlockieIcon = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  );

  const { getTokenWithBalanceAndApr } = useEarnTokenDetails();
  const earnToken = getTokenWithBalanceAndApr(token);

  return (
    <InfoSection testID={STABLECOIN_DEPOSIT_TEST_IDS.DEPOSIT_DETAILS_SECTION}>
      <View style={styles.infoSectionContent}>
        <KeyValueRow
          field={{
            label: {
              text: strings('earn.apr'),
              variant: TextVariant.BodyMDMedium,
            },
            tooltip: {
              title: strings('earn.apr'),
              content:
                'Commodo officia id eu amet reprehenderit excepteur fugiat amet sint enim voluptate culpa ullamco commodo.',
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
              content:
                'Incididunt nisi proident voluptate velit dolor ullamco fugiat ex minim consequat nisi pariatur.',
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
              content:
                'Incididunt nisi proident voluptate velit dolor ullamco fugiat ex minim consequat nisi pariatur.',
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
              content:
                'Incididunt nisi proident voluptate velit dolor ullamco fugiat ex minim consequat nisi pariatur.',
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
