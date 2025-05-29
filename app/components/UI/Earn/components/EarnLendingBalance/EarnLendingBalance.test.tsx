import React from 'react';
import EarnLendingBalance, { EARN_LENDING_BALANCE_TEST_IDS } from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import useLendingTokenPair from '../../hooks/useLendingTokenPair';
import { createMockToken } from '../../../Stake/testUtils';
import { EarnTokenDetails } from '../../hooks/useEarnTokenDetails';
import { TokenI } from '../../../Tokens/types';
import { act, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../hooks/useLendingTokenPair');

jest.mock('../../selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn(),
}));

describe('EarnLendingBalance', () => {
  const mockDaiMainnet: Partial<EarnTokenDetails> = {
    ...createMockToken({
      symbol: 'DAI',
      address: '0x018008bfb33d285247A21d44E50697654f754e63',
      chainId: '0x1',
      name: 'Dai Stablecoin',
      balance: '76.04796 DAI',
      balanceFiat: '$76.00',
    }),
    balanceFormatted: '76.04796 DAI',
  };

  const mockADAIMainnet: Partial<EarnTokenDetails> = {
    ...createMockToken({
      symbol: 'ADAI',
      address: '0x018008bfb33d285247A21d44E50697654f754e63',
      chainId: '0x1',
      name: 'Aave v3 DAI',
      balance: '32.05 ADAI',
      balanceFiat: '$32.05',
    }),
    balanceFormatted: '32.05 ADAI',
  };

  const mockInitialState = {
    engine: {
      backgroundState,
    },
  };

  beforeEach(() => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);

    (
      useLendingTokenPair as jest.MockedFunction<typeof useLendingTokenPair>
    ).mockReturnValue({
      lendingToken: mockDaiMainnet,
      receiptToken: mockADAIMainnet,
    });
  });

  it('renders balance and buttons by default', () => {
    const { toJSON, getByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet as TokenI} />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
    expect(
      getByTestId(
        EARN_LENDING_BALANCE_TEST_IDS.RECEIPT_TOKEN_BALANCE_ASSET_LOGO,
      ),
    ).toBeDefined();
    expect(
      getByTestId(EARN_LENDING_BALANCE_TEST_IDS.RECEIPT_TOKEN_LABEL),
    ).toBeDefined();
    expect(
      getByTestId(EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON),
    ).toBeDefined();
    expect(
      getByTestId(EARN_LENDING_BALANCE_TEST_IDS.DEPOSIT_BUTTON),
    ).toBeDefined();
  });

  it('hides balances when displayBalance is false', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <EarnLendingBalance
        asset={mockDaiMainnet as TokenI}
        displayBalance={false}
      />,
      { state: mockInitialState },
    );

    // Hidden
    expect(
      queryByTestId(EARN_LENDING_BALANCE_TEST_IDS.RECEIPT_TOKEN_LABEL),
    ).toBeNull();
    expect(
      queryByTestId(
        EARN_LENDING_BALANCE_TEST_IDS.RECEIPT_TOKEN_BALANCE_ASSET_LOGO,
      ),
    ).toBeNull();

    // Still Rendering Buttons
    expect(
      getByTestId(EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON),
    ).toBeDefined();
    expect(
      getByTestId(EARN_LENDING_BALANCE_TEST_IDS.DEPOSIT_BUTTON),
    ).toBeDefined();
  });

  it('hides buttons when displayButtons is false', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <EarnLendingBalance
        asset={mockDaiMainnet as TokenI}
        displayButtons={false}
      />,
      { state: mockInitialState },
    );

    // Still Rendering Balance
    expect(
      getByTestId(EARN_LENDING_BALANCE_TEST_IDS.RECEIPT_TOKEN_LABEL),
    ).toBeDefined();
    expect(
      getByTestId(
        EARN_LENDING_BALANCE_TEST_IDS.RECEIPT_TOKEN_BALANCE_ASSET_LOGO,
      ),
    ).toBeDefined();

    // Hidden
    expect(
      queryByTestId(EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(EARN_LENDING_BALANCE_TEST_IDS.DEPOSIT_BUTTON),
    ).toBeNull();
  });

  it('does not render if stablecoin lending feature flag disabled', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(false);

    const { toJSON } = renderWithProvider(
      <EarnLendingBalance
        asset={mockDaiMainnet as TokenI}
        displayButtons={false}
      />,
      { state: mockInitialState },
    );

    expect(toJSON()).toBeNull();
  });

  it('navigates to deposit screen when deposit more is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet as TokenI} />,
      { state: mockInitialState },
    );

    const depositButton = getByTestId(
      EARN_LENDING_BALANCE_TEST_IDS.DEPOSIT_BUTTON,
    );

    await act(async () => {
      fireEvent.press(depositButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      params: {
        token: {
          address: '0x018008bfb33d285247A21d44E50697654f754e63',
          aggregators: [],
          balance: '76.04796 DAI',
          balanceFiat: '$76.00',
          balanceFormatted: '76.04796 DAI',
          chainId: '0x1',
          decimals: 0,
          image: '',
          isETH: false,
          isNative: false,
          isStaked: false,
          logo: '',
          name: 'Dai Stablecoin',
          symbol: 'DAI',
          ticker: '',
        },
      },
      screen: 'Stake',
    });
  });

  it('navigates to withdrawal screen when withdraw is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet as TokenI} />,
      { state: mockInitialState },
    );

    const withdrawButton = getByTestId(
      EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON,
    );

    await act(async () => {
      fireEvent.press(withdrawButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      params: {
        token: {
          address: '0x018008bfb33d285247A21d44E50697654f754e63',
          aggregators: [],
          balance: '32.05 ADAI',
          balanceFiat: '$32.05',
          balanceFormatted: '32.05 ADAI',
          chainId: '0x1',
          decimals: 0,
          image: '',
          isETH: false,
          isNative: false,
          isStaked: false,
          logo: '',
          name: 'Aave v3 DAI',
          symbol: 'ADAI',
          ticker: '',
        },
      },
      screen: 'Unstake',
    });
  });
});
