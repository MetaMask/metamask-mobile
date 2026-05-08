import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyPotentialEarningsView from './MoneyPotentialEarningsView';
import { MoneyPotentialEarningsViewTestIds } from './MoneyPotentialEarningsView.testIds';
import { strings } from '../../../../../../locales/i18n';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { MoneyPotentialEarningsTestIds } from '../../components/MoneyPotentialEarnings/MoneyPotentialEarnings.testIds';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
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
  useMusdConversionTokens: () => ({ tokens: mockConversionTokens }),
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
    initiateCustomConversion: jest.fn(),
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

  it('renders the description text', () => {
    const { getByText } = renderWithProvider(<MoneyPotentialEarningsView />);

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

  describe('headline gradient', () => {
    it('shows the deposited Money balance when totalFiatRaw is positive', () => {
      const { getByTestId } = renderWithProvider(
        <MoneyPotentialEarningsView />,
      );

      // Default mock has totalFiatRaw='10000' / totalFiatFormatted='$10,000.00'.
      expect(getByTestId(MoneyPotentialEarningsTestIds.TEXT)).toHaveTextContent(
        '$10,000.00',
      );
    });

    it('falls back to the projected sum when totalFiatRaw is absent', () => {
      mockUseMoneyAccountBalance.mockReturnValue({
        apyPercent: 4,
        apyDecimal: 0.04,
        apyPercentFormatted: '4%',
        totalFiatFormatted: undefined,
        totalFiatRaw: undefined,
        tokenTotal: undefined,
        isAggregatedBalanceLoading: false,
        vaultApyQuery: { data: { apy: 0.04 }, isLoading: false },
        musdBalanceQuery: { data: undefined, isLoading: false },
        musdEquivalentBalanceQuery: { data: undefined, isLoading: false },
        musdFiatFormatted: undefined,
        musdSHFvdFiatFormatted: undefined,
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { getByTestId } = renderWithProvider(
        <MoneyPotentialEarningsView />,
      );

      // Tokens sum: 5000+3000+2000+1500+800+400 = 12,700 × 4% = $508.00.
      expect(getByTestId(MoneyPotentialEarningsTestIds.TEXT)).toHaveTextContent(
        '+$508.00',
      );
    });
  });
});
