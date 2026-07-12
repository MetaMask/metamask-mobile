import React from 'react';
import { BigNumber } from 'bignumber.js';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyPotentialEarningsView from './MoneyPotentialEarningsView';
import { MoneyPotentialEarningsViewTestIds } from './MoneyPotentialEarningsView.testIds';
import { strings } from '../../../../../../locales/i18n';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import Routes from '../../../../../constants/navigation/Routes';
import { moneyFormatFiat } from '../../utils/moneyFormatFiat';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { PotentialEarningsTokenRowTestIds } from '../../components/MoneyPotentialEarnings/PotentialEarningsTokenRow.testIds';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockInitiateDeposit = jest.fn();
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

const mockDepositTokens = [
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

jest.mock('../../hooks/useMoneyEarnableTokens', () => ({
  useMoneyEarnableTokens: () => ({
    tokens: mockTokens,
    isNoFeeToken: jest.fn(() => false),
  }),
}));

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: () => ({
    initiateDeposit: mockInitiateDeposit,
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
  ...jest.requireActual('../../utils/moneyFormatFiat'),
  moneyFormatFiat: jest.fn((value: BigNumber) => `$${value.toFixed(2)}`),
}));
jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(() => ({
    trackButtonClicked: jest.fn(),
    trackScreenViewed: jest.fn(),
    trackTokenButtonClicked: jest.fn(),
    trackTokenSurfaceClicked: jest.fn(),
    trackTooltipClicked: jest.fn(),
  })),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectPrivacyMode: jest.fn(() => false),
}));

const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);
const mockMoneyFormatFiat = jest.mocked(moneyFormatFiat);

describe('MoneyPotentialEarningsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokens = mockDepositTokens;
    mockInitiateDeposit.mockResolvedValue(undefined);
    mockUseMoneyAccountBalance.mockReturnValue({
      apyPercent: 4,
      apyDecimal: 0.04,
      apyPercentFormatted: '4%',
      totalFiatFormatted: '$10,000.00',
      totalFiatRaw: '10000',
      tokenTotal: undefined,
      isBalanceLoading: false,
      vaultApyQuery: {
        data: { apy: 0.04, timestamp: '2026-01-01T00:00:00Z' },
        isLoading: false,
      },
      moneyBalanceQuery: {
        data: {
          musdBalance: '10000000000',
          vmusdValueInMusd: '0',
          totalBalance: '10000000000',
        },
        isLoading: false,
      },
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

  it('formats the headline total using the token fiat currency instead of Money default fiat currency when defined', () => {
    mockTokens = [
      {
        name: 'Euro Coin',
        symbol: 'EURC',
        address: '0x0000000000000000000000000000000000000006',
        chainId: '0x1',
        decimals: 6,
        balanceInSelectedCurrency: '€5,000.00',
        fiat: { balance: 5000, currency: 'eur' },
      },
    ];

    renderWithProvider(<MoneyPotentialEarningsView />);

    expect(mockMoneyFormatFiat).toHaveBeenCalledWith(
      expect.any(BigNumber),
      'eur',
    );
  });

  it('falls back to Money default fiat currency when tokens have no fiat currency', () => {
    renderWithProvider(<MoneyPotentialEarningsView />);

    expect(mockMoneyFormatFiat).toHaveBeenCalledWith(
      expect.any(BigNumber),
      'usd',
    );
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

  it('renders the real token row balance when privacy mode is off', () => {
    jest.mocked(selectPrivacyMode).mockReturnValue(false);
    const { getAllByTestId } = renderWithProvider(
      <MoneyPotentialEarningsView />,
    );

    expect(
      getAllByTestId(PotentialEarningsTokenRowTestIds.BALANCE)[0],
    ).toHaveTextContent('$5000.00');
  });

  it('masks the token row balance when privacy mode is on', () => {
    jest.mocked(selectPrivacyMode).mockReturnValue(true);
    const { getAllByTestId } = renderWithProvider(
      <MoneyPotentialEarningsView />,
    );

    expect(
      getAllByTestId(PotentialEarningsTokenRowTestIds.BALANCE)[0],
    ).toHaveTextContent('•'.repeat(9));
  });

  it('renders the real headline total and projected amounts when privacy mode is off', () => {
    jest.mocked(selectPrivacyMode).mockReturnValue(false);
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    // Total of mockDepositTokens fiat balances: 5000+3000+2000+1500+800+400 = 12700
    expect(
      getByTestId(MoneyPotentialEarningsViewTestIds.TOTAL),
    ).toHaveTextContent('$12700.00');
    // Projected earnings at 4% APY over 1 year: 12700 * 0.04 = 508
    expect(
      getByTestId(MoneyPotentialEarningsViewTestIds.PROJECTED),
    ).toHaveTextContent('+$508.00');
  });

  it('masks the headline total and projected amounts when privacy mode is on', () => {
    jest.mocked(selectPrivacyMode).mockReturnValue(true);
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    expect(
      getByTestId(MoneyPotentialEarningsViewTestIds.TOTAL),
    ).toHaveTextContent('•'.repeat(9));
    expect(
      getByTestId(MoneyPotentialEarningsViewTestIds.PROJECTED),
    ).toHaveTextContent('•'.repeat(6));
  });

  it('renders ALL eligible tokens, not limited to 5', () => {
    const { getByText } = renderWithProvider(<MoneyPotentialEarningsView />);

    expect(getByText('USD Coin')).toBeOnTheScreen();
    expect(getByText('Tether')).toBeOnTheScreen();
    expect(getByText('Dai')).toBeOnTheScreen();
    expect(getByText('Wrapped Ether')).toBeOnTheScreen();
    expect(getByText('ChainLink')).toBeOnTheScreen();
    expect(getByText('Uniswap')).toBeOnTheScreen();
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

  it('triggers deposit when the bottom Convert CTA is pressed', async () => {
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    fireEvent.press(getByTestId(MoneyPotentialEarningsViewTestIds.CTA_BUTTON));

    await waitFor(() => expect(mockInitiateDeposit).toHaveBeenCalled());
  });

  it('disables the Convert CTA when there are no eligible tokens', () => {
    mockTokens = [];
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    expect(
      getByTestId(MoneyPotentialEarningsViewTestIds.CTA_BUTTON).props
        .accessibilityState.disabled,
    ).toBe(true);
  });

  it('pressing the back button calls navigation.goBack', () => {
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    fireEvent.press(getByTestId(MoneyPotentialEarningsViewTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('no-ops the Convert CTA when there are no eligible tokens', async () => {
    mockTokens = [];
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    fireEvent.press(getByTestId(MoneyPotentialEarningsViewTestIds.CTA_BUTTON));

    await waitFor(() => expect(mockInitiateDeposit).not.toHaveBeenCalled());
  });

  it('calls initiateDeposit from the Convert CTA', async () => {
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    fireEvent.press(getByTestId(MoneyPotentialEarningsViewTestIds.CTA_BUTTON));

    await waitFor(() => expect(mockInitiateDeposit).toHaveBeenCalled());
  });

  it('triggers deposit when a token row is pressed', async () => {
    const { getByTestId } = renderWithProvider(<MoneyPotentialEarningsView />);

    fireEvent.press(
      getByTestId(MoneyPotentialEarningsViewTestIds.TOKEN_ROW(0)),
    );

    await waitFor(() => expect(mockInitiateDeposit).toHaveBeenCalled());
  });
});
