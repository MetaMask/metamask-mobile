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
  REWARD_FREQUENCY: 'Daily',
  WITHDRAWAL_TIME: 'Immediate',
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
        {/* <InfoRow label="test">{earnToken.apr}</InfoRow> */}
        <KeyValueRow
          field={{
            label: {
              text: 'APR',
              variant: TextVariant.BodyMDMedium,
            },
            tooltip: {
              title: 'APR',
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
              text: 'Est. annual reward',
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
              text: 'Reward frequency',
            },
            tooltip: {
              title: 'Reward frequency',
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
              text: 'Withdrawal time',
            },
            tooltip: {
              title: 'Withdrawal time',
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
              text: 'Protocol',
            },
            tooltip: {
              title: 'Protocol',
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
