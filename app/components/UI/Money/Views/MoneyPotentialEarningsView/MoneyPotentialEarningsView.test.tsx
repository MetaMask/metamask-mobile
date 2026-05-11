import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyPotentialEarningsView from './MoneyPotentialEarningsView';
import { MoneyPotentialEarningsViewTestIds } from './MoneyPotentialEarningsView.testIds';
import { strings } from '../../../../../../locales/i18n';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import Routes from '../../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockInitiateCustomConversion = jest.fn();
let mockTokens: unknown[] = [];

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
  };
});

const mockConversionTokens = [
  {
    name: 'USD Coin',
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: '0x1',
    decimals: 6,
    balanceInSelectedCurrency: '$5,000.00',
    fiat: { balance: 5000 },
  },
  {
    name: 'Tether',
    symbol: 'USDT',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: '0x1',
    decimals: 6,
    balanceInSelectedCurrency: '$3,000.00',
    fiat: { balance: 3000 },
  },
  {
    name: 'Dai',
    symbol: 'DAI',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    chainId: '0x1',
    decimals: 18,
    balanceInSelectedCurrency: '$2,000.00',
    fiat: { balance: 2000 },
  },
  {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    chainId: '0x1',
    decimals: 18,
    balanceInSelectedCurrency: '$1,500.00',
    fiat: { balance: 1500 },
  },
  {
    name: 'ChainLink',
    symbol: 'LINK',
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    chainId: '0x1',
    decimals: 18,
    balanceInSelectedCurrency: '$800.00',
    fiat: { balance: 800 },
  },
  {
    name: 'Uniswap',
    symbol: 'UNI',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    chainId: '0x1',
    decimals: 18,
    balanceInSelectedCurrency: '$400.00',
    fiat: { balance: 400 },
  },
];

jest.mock('../../../Earn/hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: () => ({ tokens: mockTokens }),
  STABLECOIN_SYMBOLS: new Set(['USDC', 'USDT', 'DAI']),
  tokenFiatValue: (token: { fiat?: { balance?: number } }) =>
    token?.fiat?.balance ?? 0,
}));

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../Earn/hooks/useMusdConversion', () => ({
  useMusdConversion: () => ({
    initiateCustomConversion: mockInitiateCustomConversion,
  }),
}));

jest.mock(
  '../../../../UI/Assets/components/AssetLogo/AssetLogo',
  () => 'AssetLogo',
);
jest.mock(
  '../../../../../component-library/components/Badges/BadgeWrapper',
  () => ({
    __esModule: true,
    default: 'BadgeWrapper',
    BadgePosition: { BottomRight: 'BottomRight' },
  }),
);
jest.mock('../../../../../component-library/components/Badges/Badge', () => ({
  __esModule: true,
  default: 'Badge',
  BadgeVariant: { Network: 'Network' },
}));
jest.mock('../../../../UI/AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => null),
}));
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');
jest.mock('../../utils/moneyFormatFiat', () => ({
  moneyFormatFiat: jest.fn((value: BigNumber) => `$${value.toFixed(2)}`),
}));

const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);

describe('MoneyPotentialEarningsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokens = mockConversionTokens;
    mockInitiateCustomConversion.mockResolvedValue(undefined);
    mockUseMoneyAccountBalance.mockReturnValue({
      apyPercent: 4,
      apyDecimal: 0.04,
      apyPercentFormatted: '4%',
      totalFiatFormatted: '$10,000.00',
      totalFiatRaw: '10000',
      tokenTotal: undefined,
      isAggregatedBalanceLoading: false,
      vaultApyQuery: {
        data: { apy: 0.04, timestamp: '2026-01-01T00:00:00Z' },
        isLoading: false,
      },
      musdBalanceQuery: {
        data: { balance: '10000000000' },
        isLoading: false,
      },
      musdEquivalentBalanceQuery: {
        data: {
          musdEquivalentValue: '0',
          musdSHFvdBalance: '0',
          exchangeRate: '1000000',
        },
        isLoading: false,
      },
      musdFiatFormatted: '$10,000.00',
      musdSHFvdFiatFormatted: '$0.00',
    } as ReturnType<typeof useMoneyAccountBalance>);
  });

  it('renders the container', () => {
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    expect(
      getByTestId(MoneyPotentialEarningsViewTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the scroll view', () => {
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    expect(
      getByTestId(MoneyPotentialEarningsViewTestIds.SCROLL_VIEW),
    ).toBeOnTheScreen();
  });

  it('renders the section title', () => {
    const { getByText } = renderWithProvider(<MoneyPotentialEarningsView />);

    expect(
      getByText(strings('money.potential_earnings.title')),
    ).toBeOnTheScreen();
  });

  it('renders the parameterized description with total and projected amounts when there are eligible tokens', () => {
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    const description = getByTestId(
      MoneyPotentialEarningsViewTestIds.DESCRIPTION,
    );
    expect(description).toBeOnTheScreen();
    expect(description).toHaveTextContent(/Convert your/);
    expect(description).toHaveTextContent(/in one year\./);
    // green-highlighted projected amount renders inline with a "+" prefix
    expect(description).toHaveTextContent(/\+\$/);
  });

  it('falls back to the generic description when there are no eligible tokens', () => {
    mockTokens = [];

    const { getByTestId, getByText } = renderWithProvider(
      <MoneyPotentialEarningsView />,
    );

    expect(
      getByTestId(MoneyPotentialEarningsViewTestIds.DESCRIPTION),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.potential_earnings.description')),
    ).toBeOnTheScreen();
  });

  it('renders ALL eligible tokens, not limited to 5', () => {
    const { getByText } = renderWithProvider(<MoneyPotentialEarningsView />);

    expect(getByText('USDC')).toBeOnTheScreen();
    expect(getByText('USDT')).toBeOnTheScreen();
    expect(getByText('DAI')).toBeOnTheScreen();
    expect(getByText('WETH')).toBeOnTheScreen();
    expect(getByText('LINK')).toBeOnTheScreen();
    expect(getByText('UNI')).toBeOnTheScreen();
  });

  it('renders the view without errors', () => {
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    expect(
      getByTestId(MoneyPotentialEarningsViewTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the top-right info button', () => {
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    expect(
      getByTestId(MoneyPotentialEarningsViewTestIds.INFO_BUTTON),
    ).toBeOnTheScreen();
  });

  it('opens the earn-crypto info sheet when the info button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    fireEvent.press(getByTestId(MoneyPotentialEarningsViewTestIds.INFO_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.MODALS.ROOT,
      expect.objectContaining({
        screen: Routes.MONEY.MODALS.EARN_CRYPTO_INFO_SHEET,
      }),
    );
  });

  it('renders the bottom Convert CTA with the correct label', () => {
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    const ctaButton = getByTestId(MoneyPotentialEarningsViewTestIds.CTA_BUTTON);
    expect(ctaButton).toBeOnTheScreen();
    expect(ctaButton).toHaveTextContent(
      strings('money.potential_earnings.convert_cta'),
    );
  });

  it('triggers conversion when the bottom Convert CTA is pressed', async () => {
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    fireEvent.press(getByTestId(MoneyPotentialEarningsViewTestIds.CTA_BUTTON));

    await waitFor(() =>
      expect(mockInitiateCustomConversion).toHaveBeenCalled(),
    );
  });

  it('disables the Convert CTA when there are no eligible tokens', () => {
    mockTokens = [];
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    expect(
      getByTestId(MoneyPotentialEarningsViewTestIds.CTA_BUTTON).props
        .accessibilityState.disabled,
    ).toBe(true);
  });
});
