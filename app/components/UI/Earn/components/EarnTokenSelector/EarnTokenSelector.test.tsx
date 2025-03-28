// app/components/UI/Stake/components/EarnTokenSelector/EarnTokenSelector.test.tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import EarnTokenSelector from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MOCK_USDC_MAINNET_ASSET } from '../../../Stake/__mocks__/mockData';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { TokenI } from '../../../../UI/Tokens/types';

const mockNavigate = jest.fn();

const MOCK_APR_VALUES: { [symbol: string]: string } = {
  Ethereum: '2.3',
  USDC: '4.5',
  USDT: '4.1',
  DAI: '5.0',
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

// Mock the useEarnTokenDetails hook
jest.mock('../../hooks/useEarnTokenDetails', () => ({
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

describe('EarnTokenSelector', () => {
  const mockProps = {
    token: MOCK_USDC_MAINNET_ASSET,
  };

  const mockInitialState = {
    engine: {
      backgroundState,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <EarnTokenSelector {...mockProps} />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays token symbol and APR', () => {
    const { getByText } = renderWithProvider(
      <EarnTokenSelector {...mockProps} />,
      { state: mockInitialState },
    );
    expect(getByText('4.5% APR')).toBeDefined();
    expect(getByText('6.84314 USDC')).toBeDefined();
  });

  it('navigates to earn token list when pressed', () => {
    const { getByTestId } = renderWithProvider(
      <EarnTokenSelector {...mockProps} />,
      { state: mockInitialState },
    );
    const button = getByTestId('earn-token-selector');
    fireEvent.press(button);
    expect(mockNavigate).toHaveBeenCalledWith('StakeModals', {
      screen: 'EarnTokenList',
    });
  });
});
