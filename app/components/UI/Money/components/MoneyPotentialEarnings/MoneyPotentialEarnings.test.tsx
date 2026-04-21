import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyPotentialEarnings from './MoneyPotentialEarnings';
import { MoneyPotentialEarningsTestIds } from './MoneyPotentialEarnings.testIds';
import { strings } from '../../../../../../locales/i18n';
import { AssetType } from '../../../../Views/confirmations/types/token';

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
jest.mock('../../../SimulationDetails/FiatDisplay/useFiatFormatter', () => ({
  __esModule: true,
  default: () => (amount: { toString: () => string }) =>
    `$${Number(amount.toString()).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
}));

const makeToken = (overrides: Partial<AssetType>): AssetType =>
  ({
    name: 'Token',
    symbol: 'TOK',
    address: '0x0000000000000000000000000000000000000000',
    chainId: '0x1',
    decimals: 18,
    balanceInSelectedCurrency: '$0.00',
    fiat: { balance: 0 },
    ...overrides,
  }) as AssetType;

const MOCK_USDC = makeToken({
  name: 'USD Coin',
  symbol: 'USDC',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  balanceInSelectedCurrency: '$5,000.00',
  fiat: { balance: 5000 },
});

const MOCK_USDT = makeToken({
  name: 'Tether',
  symbol: 'USDT',
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  balanceInSelectedCurrency: '$4,000.00',
  fiat: { balance: 4000 },
});

const MOCK_DAI = makeToken({
  name: 'Dai',
  symbol: 'DAI',
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  balanceInSelectedCurrency: '$1,000.00',
  fiat: { balance: 1000 },
});

const MOCK_ETH = makeToken({
  name: 'Ether',
  symbol: 'ETH',
  address: '0x0000000000000000000000000000000000000001',
  balanceInSelectedCurrency: '$15,000.00',
  fiat: { balance: 15000 },
});

const MOCK_SOL = makeToken({
  name: 'Solana',
  symbol: 'SOL',
  address: '0x0000000000000000000000000000000000000002',
  balanceInSelectedCurrency: '$2,000.00',
  fiat: { balance: 2000 },
});

describe('MoneyPotentialEarnings', () => {
  it('returns null when there are no tokens with balance', () => {
    const { queryByTestId } = render(
      <MoneyPotentialEarnings apy={4} tokens={[]} />,
    );

    expect(
      queryByTestId(MoneyPotentialEarningsTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders the section title and description', () => {
    const { getByText } = render(
      <MoneyPotentialEarnings apy={4} tokens={[MOCK_USDC]} />,
    );

    expect(
      getByText(strings('money.potential_earnings.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.potential_earnings.description')),
    ).toBeOnTheScreen();
  });

  it('computes the aggregate projected amount from token fiat balances', () => {
    // USDC 5000 + USDT 4000 = 9000 * 0.2 = 1800
    const { getByTestId } = render(
      <MoneyPotentialEarnings apy={4} tokens={[MOCK_USDC, MOCK_USDT]} />,
    );

    expect(getByTestId(MoneyPotentialEarningsTestIds.AMOUNT)).toHaveTextContent(
      '+$1,800.00',
    );
  });

  it('excludes tokens with zero balance', () => {
    const zeroBalanceToken = makeToken({
      name: 'Zero',
      symbol: 'ZERO',
      address: '0x0000000000000000000000000000000000000003',
      balanceInSelectedCurrency: '$0.00',
      fiat: { balance: 0 },
    });

    const { queryByText } = render(
      <MoneyPotentialEarnings apy={4} tokens={[MOCK_USDC, zeroBalanceToken]} />,
    );

    expect(queryByText('ZERO')).not.toBeOnTheScreen();
  });

  it('renders at most five tokens', () => {
    const extra = makeToken({
      name: 'Extra',
      symbol: 'EXT',
      address: '0x0000000000000000000000000000000000000004',
      fiat: { balance: 100 },
    });
    const { queryByText } = render(
      <MoneyPotentialEarnings
        apy={4}
        tokens={[MOCK_USDC, MOCK_USDT, MOCK_DAI, MOCK_ETH, MOCK_SOL, extra]}
      />,
    );

    expect(queryByText('EXT')).not.toBeOnTheScreen();
  });

  it('renders the View all button whenever the section has any tokens', () => {
    const { getByTestId } = render(
      <MoneyPotentialEarnings apy={4} tokens={[MOCK_USDC]} />,
    );

    expect(
      getByTestId(MoneyPotentialEarningsTestIds.VIEW_ALL_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls onViewAllPress when View all is pressed', () => {
    const onViewAll = jest.fn();
    const { getByTestId } = render(
      <MoneyPotentialEarnings
        apy={4}
        tokens={[MOCK_USDC]}
        onViewAllPress={onViewAll}
      />,
    );

    fireEvent.press(getByTestId(MoneyPotentialEarningsTestIds.VIEW_ALL_BUTTON));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('calls onTokenPress with the pressed token when Convert is tapped', () => {
    const onTokenPress = jest.fn();
    const { getByText } = render(
      <MoneyPotentialEarnings
        apy={4}
        tokens={[MOCK_USDC]}
        onTokenPress={onTokenPress}
      />,
    );

    fireEvent.press(getByText(strings('money.potential_earnings.convert')));

    expect(onTokenPress).toHaveBeenCalledWith(MOCK_USDC);
  });

  it('calls onHeaderPress when the section header is tapped', () => {
    const onHeader = jest.fn();
    const { getByText } = render(
      <MoneyPotentialEarnings
        apy={4}
        tokens={[MOCK_USDC]}
        onHeaderPress={onHeader}
      />,
    );

    fireEvent.press(getByText(strings('money.potential_earnings.title')));

    expect(onHeader).toHaveBeenCalledTimes(1);
  });

  it('hides the gradient amount when apy is undefined', () => {
    const { queryByTestId } = render(
      <MoneyPotentialEarnings apy={undefined} tokens={[MOCK_USDC]} />,
    );

    expect(
      queryByTestId(MoneyPotentialEarningsTestIds.AMOUNT),
    ).not.toBeOnTheScreen();
  });

  it('hides the per-token projected earning text when apy is zero', () => {
    const { queryByText } = render(
      <MoneyPotentialEarnings apy={0} tokens={[MOCK_USDC]} />,
    );

    // With apy=0 the projected multiplier is 0 so projectedFiatNumber is 0,
    // which fails isPositiveNumber and hides the "+$..." text in each token row.
    expect(queryByText(/^\+\$/)).not.toBeOnTheScreen();
  });
});
