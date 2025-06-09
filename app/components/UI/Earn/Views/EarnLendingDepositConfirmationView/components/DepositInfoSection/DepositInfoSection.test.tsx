import React from 'react';
import DepositInfoSection, { DepositInfoSectionProps } from '.';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { MOCK_USDC_MAINNET_ASSET } from '../../../../../Stake/__mocks__/stakeMockData';
import { CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS } from '../../../../utils/tempLending';
import { TokenI } from '../../../../../Tokens/types';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import { strings } from '../../../../../../../../locales/i18n';

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

jest.mock('../../../../hooks/useEarnTokenDetails', () => ({
  useEarnTokenDetails: () => ({
    getTokenWithBalanceAndApr: (token: TokenI) => ({
      ...token,
      apr: MOCK_APR_VALUES[token.symbol] || '0.0',
      balanceFormatted: token.symbol === 'USDC' ? '6.84314 USDC' : '0',
      balanceFiat: token.symbol === 'USDC' ? '$6.84' : '$0.00',
      balanceMinimalUnit: token.symbol === 'USDC' ? '6.84314' : '0',
      balanceFiatNumber: token.symbol === 'USDC' ? 6.84314 : 0,
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
    lendingProtocol: 'AAVE v3',
    lendingContractAddress: CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS['0x1'],
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
      // MOCK_DATA to replace before launch
      '$5.00',
      '5 DAI',
    ];

    expectedDefinedStrings.forEach((str) => {
      expect(getByText(str)).toBeDefined();
    });

    expect(toJSON()).toMatchSnapshot();
  });
});
