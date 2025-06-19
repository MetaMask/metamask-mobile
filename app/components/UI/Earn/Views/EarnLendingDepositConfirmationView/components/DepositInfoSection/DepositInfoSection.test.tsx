import { CHAIN_ID_TO_AAVE_POOL_CONTRACT } from '@metamask/stake-sdk';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import React from 'react';
import DepositInfoSection, { DepositInfoSectionProps } from '.';
import { strings } from '../../../../../../../../locales/i18n';
import { getDecimalChainId } from '../../../../../../../util/networks';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { MOCK_USDC_MAINNET_ASSET } from '../../../../../Stake/__mocks__/stakeMockData';
import { LendingProtocol } from '../../../../types/lending.types';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

const MOCK_APR_VALUES: { [symbol: string]: string } = {
  Ethereum: '2.3',
  USDC: '4.5',
  USDT: '4.1',
  DAI: '5.0',
};

jest.mock('../../../../hooks/useEarnToken', () => ({
  __esModule: true,
  default: () => ({
    earnToken: {
      ...MOCK_USDC_MAINNET_ASSET,
      experience: {
        apr: MOCK_APR_VALUES[MOCK_USDC_MAINNET_ASSET.symbol] || '0.0',
      },
    },
    getEstimatedAnnualRewardsForAmount: () => ({
      estimatedAnnualRewardsFormatted: '$5.00',
      estimatedAnnualRewardsTokenFormatted: '5 USDC',
    }),
  }),
}));

describe('DepositInfoSection', () => {
  const mockInitialState = {
    engine: {
      backgroundState,
    },
  };

  const USDC_TOKEN = MOCK_USDC_MAINNET_ASSET;

  const defaultProps: DepositInfoSectionProps = {
    token: USDC_TOKEN,
    lendingProtocol: LendingProtocol.AAVE,
    lendingContractAddress:
      CHAIN_ID_TO_AAVE_POOL_CONTRACT[getDecimalChainId(CHAIN_IDS.MAINNET)],
    amountTokenMinimalUnit: '5.0',
    amountFiatNumber: 5.0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON, getByText } = renderWithProvider(
      <DepositInfoSection {...defaultProps} />,
      { state: mockInitialState },
    );

    const expectedDefinedStrings = [
      strings('earn.every_minute'),
      strings('earn.immediate'),
      strings('earn.apr'),
      strings('stake.estimated_annual_reward'),
      strings('stake.reward_frequency'),
      strings('stake.withdrawal_time'),
      strings('earn.protocol'),
      '$5.00',
      '5 USDC',
    ];

    expectedDefinedStrings.forEach((str) => {
      expect(getByText(str)).toBeDefined();
    });

    expect(toJSON()).toMatchSnapshot();
  });
});
