import React from 'react';
import { BigNumber } from 'bignumber.js';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyPotentialEarnings from './MoneyPotentialEarnings';
import { MoneyPotentialEarningsTestIds } from './MoneyPotentialEarnings.testIds';
import { MoneySectionHeaderTestIds } from '../MoneySectionHeader/MoneySectionHeader.testIds';
import { strings } from '../../../../../../locales/i18n';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { moneyFormatFiat } from '../../utils/moneyFormatFiat';

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

const mockMoneyFormatFiat = jest.mocked(moneyFormatFiat);

describe('MoneyPotentialEarnings', () => {
  beforeEach(() => {
    mockMoneyFormatFiat.mockClear();
  });

  it('returns null when there are no tokens with balance', () => {
    const { queryByTestId } = render(
      <MoneyPotentialEarnings apyDecimal={0.04} tokens={[]} />,
    );

    expect(
      queryByTestId(MoneyPotentialEarningsTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders the section title and parameterized description', () => {
    const { getByText, getByTestId } = render(
      <MoneyPotentialEarnings apyDecimal={0.04} tokens={[MOCK_USDC]} />,
    );

    expect(
      getByText(strings('money.potential_earnings.title')),
    ).toBeOnTheScreen();
    const description = getByTestId(MoneyPotentialEarningsTestIds.TEXT);
    expect(description).toHaveTextContent(/Convert your/);
    expect(description).toHaveTextContent(/in one year\./);
  });

  it('computes the aggregate projected amount from token fiat balances', () => {
    // USDC $5000 + USDT $4000 = $9000 × (4% APY × 1 year) = $360.00
    const { getByTestId } = render(
      <MoneyPotentialEarnings
        apyDecimal={0.04}
        tokens={[MOCK_USDC, MOCK_USDT]}
      />,
    );

    expect(getByTestId(MoneyPotentialEarningsTestIds.TEXT)).toHaveTextContent(
      /\+\$360\.00/,
    );
  });

  it('formats the headline total using the token fiat currency instead of a Money default currency when defined', () => {
    const eurToken = makeToken({
      symbol: 'EURC',
      address: '0x0000000000000000000000000000000000000005',
      fiat: { balance: 5000, currency: 'eur' },
    });

    render(<MoneyPotentialEarnings apyDecimal={0.04} tokens={[eurToken]} />);

    expect(mockMoneyFormatFiat).toHaveBeenCalledWith(
      expect.any(BigNumber),
      'eur',
    );
  });

  it('falls back to the Money default currency when tokens have no fiat currency', () => {
    render(<MoneyPotentialEarnings apyDecimal={0.04} tokens={[MOCK_USDC]} />);

    expect(mockMoneyFormatFiat).toHaveBeenCalledWith(
      expect.any(BigNumber),
      'usd',
    );
  });

  it('renders the projected amount as a plain Text (no gradient mask)', () => {
    const { getByTestId, toJSON } = render(
      <MoneyPotentialEarnings apyDecimal={0.04} tokens={[MOCK_USDC]} />,
    );

    // The filled state should be a plain DSRN Text, not the masked gradient
    // wrapper that used to host it. `MaskedView` and `LinearGradient` are
    // both mocked as plain string components in this suite, so their type
    // would surface in the serialized tree if MoneyGradientText were used.
    expect(getByTestId(MoneyPotentialEarningsTestIds.TEXT)).toBeOnTheScreen();
    const serialized = JSON.stringify(toJSON());
    expect(serialized).not.toContain('MaskedView');
    expect(serialized).not.toContain('LinearGradient');
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
      <MoneyPotentialEarnings
        apyDecimal={0.04}
        tokens={[MOCK_USDC, zeroBalanceToken]}
      />,
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
        apyDecimal={0.04}
        tokens={[MOCK_USDC, MOCK_USDT, MOCK_DAI, MOCK_ETH, MOCK_SOL, extra]}
      />,
    );

    expect(queryByText('EXT')).not.toBeOnTheScreen();
  });

  it('hides the View all button when fewer than six tokens are eligible', () => {
    const { queryByTestId } = render(
      <MoneyPotentialEarnings
        apyDecimal={0.04}
        tokens={[MOCK_USDC, MOCK_USDT, MOCK_DAI, MOCK_ETH, MOCK_SOL]}
      />,
    );

    expect(
      queryByTestId(MoneyPotentialEarningsTestIds.VIEW_ALL_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('renders the View all button when six or more tokens are eligible', () => {
    const extra = makeToken({
      name: 'Extra',
      symbol: 'EXT',
      address: '0x0000000000000000000000000000000000000004',
      fiat: { balance: 100 },
    });
    const { getByTestId } = render(
      <MoneyPotentialEarnings
        apyDecimal={0.04}
        tokens={[MOCK_USDC, MOCK_USDT, MOCK_DAI, MOCK_ETH, MOCK_SOL, extra]}
      />,
    );

    expect(
      getByTestId(MoneyPotentialEarningsTestIds.VIEW_ALL_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls onViewAllPress when View all is pressed', () => {
    const extra = makeToken({
      name: 'Extra',
      symbol: 'EXT',
      address: '0x0000000000000000000000000000000000000004',
      fiat: { balance: 100 },
    });
    const onViewAll = jest.fn();
    const { getByTestId } = render(
      <MoneyPotentialEarnings
        apyDecimal={0.04}
        tokens={[MOCK_USDC, MOCK_USDT, MOCK_DAI, MOCK_ETH, MOCK_SOL, extra]}
        onViewAllPress={onViewAll}
      />,
    );

    fireEvent.press(getByTestId(MoneyPotentialEarningsTestIds.VIEW_ALL_BUTTON));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('calls onTokenButtonPress with the pressed token when the Add button is tapped', () => {
    const onTokenPress = jest.fn();
    const { getByText } = render(
      <MoneyPotentialEarnings
        apyDecimal={0.04}
        tokens={[MOCK_USDC]}
        onTokenButtonPress={onTokenPress}
      />,
    );

    fireEvent.press(getByText(strings('money.potential_earnings.add')));

    expect(onTokenPress).toHaveBeenCalledWith(MOCK_USDC, 0, 1);
  });

  it('calls onHeaderPress when the section header is tapped', () => {
    const onHeader = jest.fn();
    const extra = makeToken({
      name: 'Extra',
      symbol: 'EXT',
      address: '0x0000000000000000000000000000000000000004',
      fiat: { balance: 100 },
    });
    const { getByText } = render(
      <MoneyPotentialEarnings
        apyDecimal={0.04}
        tokens={[MOCK_USDC, MOCK_USDT, MOCK_DAI, MOCK_ETH, MOCK_SOL, extra]}
        onHeaderPress={onHeader}
      />,
    );

    fireEvent.press(getByText(strings('money.potential_earnings.title')));

    expect(onHeader).toHaveBeenCalledTimes(1);
  });

  it('renders the section arrow when more than five tokens are eligible', () => {
    const extra = makeToken({
      name: 'Extra',
      symbol: 'EXT',
      address: '0x0000000000000000000000000000000000000004',
      fiat: { balance: 100 },
    });
    const { getByTestId } = render(
      <MoneyPotentialEarnings
        apyDecimal={0.04}
        tokens={[MOCK_USDC, MOCK_USDT, MOCK_DAI, MOCK_ETH, MOCK_SOL, extra]}
        onHeaderPress={jest.fn()}
      />,
    );

    expect(getByTestId(MoneySectionHeaderTestIds.CHEVRON)).toBeOnTheScreen();
  });

  it('hides the section arrow and ignores header taps with five or fewer eligible tokens', () => {
    const onHeader = jest.fn();
    const { queryByTestId, getByText } = render(
      <MoneyPotentialEarnings
        apyDecimal={0.04}
        tokens={[MOCK_USDC, MOCK_USDT, MOCK_DAI, MOCK_ETH, MOCK_SOL]}
        onHeaderPress={onHeader}
      />,
    );

    expect(
      queryByTestId(MoneySectionHeaderTestIds.CHEVRON),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByText(strings('money.potential_earnings.title')));
    expect(onHeader).not.toHaveBeenCalled();
  });

  it('renders the inline info button when onInfoPress is provided', () => {
    const { getByTestId } = render(
      <MoneyPotentialEarnings
        apyDecimal={0.04}
        tokens={[MOCK_USDC]}
        onInfoPress={jest.fn()}
      />,
    );

    expect(
      getByTestId(MoneyPotentialEarningsTestIds.INFO_BUTTON),
    ).toBeOnTheScreen();
  });

  it('does not render the info button when onInfoPress is omitted', () => {
    const { queryByTestId } = render(
      <MoneyPotentialEarnings apyDecimal={0.04} tokens={[MOCK_USDC]} />,
    );

    expect(
      queryByTestId(MoneyPotentialEarningsTestIds.INFO_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('calls onInfoPress when the info button is pressed', () => {
    const onInfoPress = jest.fn();
    const { getByTestId } = render(
      <MoneyPotentialEarnings
        apyDecimal={0.04}
        tokens={[MOCK_USDC]}
        onInfoPress={onInfoPress}
      />,
    );

    fireEvent.press(getByTestId(MoneyPotentialEarningsTestIds.INFO_BUTTON));

    expect(onInfoPress).toHaveBeenCalledTimes(1);
  });

  it('renders the info button in the fallback description when apy is undefined', () => {
    const onInfoPress = jest.fn();
    const { getByTestId } = render(
      <MoneyPotentialEarnings
        apyDecimal={undefined}
        tokens={[MOCK_USDC]}
        onInfoPress={onInfoPress}
      />,
    );

    fireEvent.press(getByTestId(MoneyPotentialEarningsTestIds.INFO_BUTTON));

    expect(onInfoPress).toHaveBeenCalledTimes(1);
  });

  it('hides the projected amount when apy is undefined', () => {
    const { queryByTestId } = render(
      <MoneyPotentialEarnings apyDecimal={undefined} tokens={[MOCK_USDC]} />,
    );

    expect(
      queryByTestId(MoneyPotentialEarningsTestIds.TEXT),
    ).not.toBeOnTheScreen();
  });

  it('hides the per-token projected earning text when apy is zero', () => {
    const { queryByText } = render(
      <MoneyPotentialEarnings apyDecimal={0} tokens={[MOCK_USDC]} />,
    );

    // With apy=0 the projected multiplier is 0 so projectedFiatNumber is 0,
    // which fails isPositiveNumber and hides the "+$..." text in each token row.
    expect(queryByText(/^\+\$/)).not.toBeOnTheScreen();
  });

  describe('isNoFeeToken prop — "No fee" badge', () => {
    it('renders the No fee badge on a token row when isNoFeeToken returns true', () => {
      const { getByText } = render(
        <MoneyPotentialEarnings
          apyDecimal={0.04}
          tokens={[MOCK_USDC]}
          isNoFeeToken={() => true}
        />,
      );

      expect(
        getByText(strings('money.potential_earnings.no_fee')),
      ).toBeOnTheScreen();
    });

    it('does not render the No fee badge when isNoFeeToken returns false', () => {
      const { queryByText } = render(
        <MoneyPotentialEarnings
          apyDecimal={0.04}
          tokens={[MOCK_USDC]}
          isNoFeeToken={() => false}
        />,
      );

      expect(
        queryByText(strings('money.potential_earnings.no_fee')),
      ).not.toBeOnTheScreen();
    });

    it('does not render any No fee badge when isNoFeeToken is omitted', () => {
      const { queryByText } = render(
        <MoneyPotentialEarnings apyDecimal={0.04} tokens={[MOCK_USDC]} />,
      );

      expect(
        queryByText(strings('money.potential_earnings.no_fee')),
      ).not.toBeOnTheScreen();
    });

    it('renders No fee badge only on eligible token rows', () => {
      const { getAllByText, queryByText } = render(
        <MoneyPotentialEarnings
          apyDecimal={0.04}
          tokens={[MOCK_USDC, MOCK_USDT]}
          isNoFeeToken={(token) => token.symbol === 'USDC'}
        />,
      );

      expect(
        getAllByText(strings('money.potential_earnings.no_fee')),
      ).toHaveLength(1);
      expect(queryByText('USDT')).toBeOnTheScreen();
    });
  });
});
