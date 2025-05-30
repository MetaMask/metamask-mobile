import React from 'react';
import EarnLendingBalance, { EARN_LENDING_BALANCE_TEST_IDS } from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import { createMockToken } from '../../../Stake/testUtils';
import { TokenI } from '../../../Tokens/types';
import { act, fireEvent } from '@testing-library/react-native';
import { EarnTokenDetails } from '../../types/lending.types';
import { getMockUseEarnTokens } from '../../__mocks__/earnMockData';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { EARN_EMPTY_STATE_CTA_TEST_ID } from '../EmptyStateCta';
import { strings } from '../../../../../../locales/i18n';

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

const mockEarnTokenPair = jest.fn();

const MOCK_APR_VALUES: { [symbol: string]: string } = {
  Ethereum: '2.3',
  USDC: '4.5',
  USDT: '4.1',
  DAI: '5.0',
};

jest.mock('../../hooks/useEarnTokens', () => ({
  __esModule: true,
  default: () => ({
    getEarnToken: (token: TokenI) => {
      const experiences = [
        {
          type: 'STABLECOIN_LENDING',
          apr: MOCK_APR_VALUES?.[token.symbol] ?? '',
          estimatedAnnualRewardsFormatted: '',
          estimatedAnnualRewardsFiatNumber: 0,
        },
      ];

      return {
        ...token,
        balanceFormatted: token.symbol === 'USDC' ? '6.84314 USDC' : '0',
        balanceFiat: token.symbol === 'USDC' ? '$6.84' : '$0.00',
        balanceMinimalUnit: token.symbol === 'USDC' ? '6.84314' : '0',
        balanceFiatNumber: token.symbol === 'USDC' ? 6.84314 : 0,
        experiences,
        tokenUsdExchangeRate: 0,
        experience: experiences[0],
      };
    },
    getPairedEarnTokens: mockEarnTokenPair,
  }),
}));

jest.mock('../../selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: jest.fn(),
  selectStablecoinLendingEnabledFlag: jest.fn(),
}));

describe('EarnLendingBalance', () => {
  const mockUsdcMainnet: Partial<EarnTokenDetails> = {
    ...createMockToken({
      symbol: 'USDC',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      chainId: '0x1',
      name: 'USDC',
      balance: '76.04796 USDC',
      balanceFiat: '$76.00',
    }),
    balanceFormatted: '76.04796 USDC',
  };

  const mockAUSDCMainnet: Partial<EarnTokenDetails> = {
    ...createMockToken({
      symbol: 'AUSDC',
      address: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
      chainId: '0x1',
      name: 'AUSDC',
      balance: '76.04796 AUSDC',
      balanceFiat: '$76.00',
    }),
    balanceFormatted: '76.04796 AUSDC',
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

    mockEarnTokenPair.mockReturnValue(
      getMockUseEarnTokens(EARN_EXPERIENCES.STABLECOIN_LENDING),
    );
  });

  it('renders balance and buttons when user has lending positions', () => {
    const { toJSON, getByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockUsdcMainnet as TokenI} />,
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

  it('hides balances when asset prop is an output token', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockAUSDCMainnet as TokenI} />,
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

  it("hides buttons when user does't have lending position", () => {
    const mockLendingTokenPair = getMockUseEarnTokens(
      EARN_EXPERIENCES.STABLECOIN_LENDING,
    );

    mockLendingTokenPair.outputToken.balanceMinimalUnit = '0';

    mockEarnTokenPair.mockReturnValue(mockLendingTokenPair);

    const { queryByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockUsdcMainnet as TokenI} />,
      { state: mockInitialState },
    );

    // Hidden
    expect(
      queryByTestId(EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(EARN_LENDING_BALANCE_TEST_IDS.DEPOSIT_BUTTON),
    ).toBeNull();
  });

  it('displays earn empty state cta when user has no lending positions', () => {
    const mockLendingTokenPair = getMockUseEarnTokens(
      EARN_EXPERIENCES.STABLECOIN_LENDING,
    );

    mockLendingTokenPair.outputToken.balanceMinimalUnit = '0';

    mockEarnTokenPair.mockReturnValue(mockLendingTokenPair);

    const { getByTestId, getByText } = renderWithProvider(
      <EarnLendingBalance asset={mockUsdcMainnet as TokenI} />,
      { state: mockInitialState },
    );

    // Hidden
    expect(getByTestId(EARN_EMPTY_STATE_CTA_TEST_ID)).toBeDefined();
    expect(
      getByText(
        strings('earn.empty_state_cta.heading', {
          tokenSymbol: mockLendingTokenPair.earnToken.symbol,
        }),
      ),
    ).toBeDefined();
  });

  it('does not render if stablecoin lending feature flag disabled', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(false);

    const { toJSON } = renderWithProvider(
      <EarnLendingBalance asset={mockUsdcMainnet as TokenI} />,
      { state: mockInitialState },
    );

    expect(toJSON()).toBeNull();
  });

  it('navigates to deposit screen when deposit more is pressed', async () => {
    const mockLendingTokenPair = getMockUseEarnTokens(
      EARN_EXPERIENCES.STABLECOIN_LENDING,
    );

    const { getByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockUsdcMainnet as TokenI} />,
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
        token: mockLendingTokenPair.earnToken,
      },
      screen: 'Stake',
    });
  });

  it('navigates to withdrawal screen when withdraw is pressed', async () => {
    const mockLendingTokenPair = getMockUseEarnTokens(
      EARN_EXPERIENCES.STABLECOIN_LENDING,
    );

    const { getByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockUsdcMainnet as TokenI} />,
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
        token: mockLendingTokenPair.outputToken,
      },
      screen: 'Unstake',
    });
  });
});
