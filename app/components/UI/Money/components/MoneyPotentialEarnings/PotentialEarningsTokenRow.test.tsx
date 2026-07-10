import React from 'react';
import { BigNumber } from 'bignumber.js';
import { render, fireEvent } from '@testing-library/react-native';
import PotentialEarningsTokenRow from './PotentialEarningsTokenRow';
import { PotentialEarningsTokenRowTestIds } from './PotentialEarningsTokenRow.testIds';
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

const mockMoneyFormatFiat = jest.mocked(moneyFormatFiat);

describe('PotentialEarningsTokenRow', () => {
  beforeEach(() => {
    mockMoneyFormatFiat.mockClear();
  });

  it('renders the token name', () => {
    const { getByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        apyDecimal={0.2}
        onCardPress={jest.fn()}
        onButtonPress={jest.fn()}
      />,
    );

    expect(getByText('USD Coin')).toBeOnTheScreen();
  });

  it('renders the token fiat balance', () => {
    const { getByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        apyDecimal={0.2}
        onCardPress={jest.fn()}
        onButtonPress={jest.fn()}
      />,
    );

    expect(getByText('$5000.00')).toBeOnTheScreen();
  });

  it('renders projected earnings when multiplier produces a positive value', () => {
    const { getByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        apyDecimal={0.2}
        onCardPress={jest.fn()}
        onButtonPress={jest.fn()}
      />,
    );

    expect(getByText('+$1000.00')).toBeOnTheScreen();
  });

  it('hides projected earnings when multiplier is zero', () => {
    const { queryByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        apyDecimal={0}
        onCardPress={jest.fn()}
        onButtonPress={jest.fn()}
      />,
    );

    expect(queryByText(/^\+\$/)).toBeNull();
  });

  it('renders the "No fee" tag when hasSubsidizedFee is true', () => {
    const { getByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee
        apyDecimal={0.2}
        onCardPress={jest.fn()}
        onButtonPress={jest.fn()}
      />,
    );

    expect(
      getByText(strings('money.potential_earnings.no_fee')),
    ).toBeOnTheScreen();
  });

  it('hides the "No fee" tag when hasSubsidizedFee is false', () => {
    const { queryByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        apyDecimal={0.2}
        onCardPress={jest.fn()}
        onButtonPress={jest.fn()}
      />,
    );

    expect(
      queryByText(strings('money.potential_earnings.no_fee')),
    ).not.toBeOnTheScreen();
  });

  it('renders the Add button', () => {
    const { getByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        apyDecimal={0.2}
        onCardPress={jest.fn()}
        onButtonPress={jest.fn()}
      />,
    );

    expect(
      getByText(strings('money.potential_earnings.add')),
    ).toBeOnTheScreen();
  });

  it('calls onButtonPress when the Add button is pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        apyDecimal={0.2}
        onCardPress={jest.fn()}
        onButtonPress={mockOnPress}
      />,
    );

    fireEvent.press(getByText(strings('money.potential_earnings.add')));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('calls onCardPress when the row pressable area is pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        apyDecimal={0.2}
        onCardPress={mockOnPress}
        onButtonPress={jest.fn()}
      />,
    );

    fireEvent.press(getByText('USD Coin'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('formats the balance using the token fiat currency instead of Money default fiat currency when defined', () => {
    const eurToken = makeToken({
      symbol: 'EURC',
      fiat: { balance: 5000, currency: 'eur' },
    });

    render(
      <PotentialEarningsTokenRow
        token={eurToken}
        hasSubsidizedFee={false}
        apyDecimal={0.2}
        onCardPress={jest.fn()}
        onButtonPress={jest.fn()}
      />,
    );

    expect(mockMoneyFormatFiat).toHaveBeenCalledWith(
      expect.any(BigNumber),
      'eur',
    );
  });

  it('falls back to the Money default currency when the token has no fiat currency', () => {
    render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        apyDecimal={0.2}
        onCardPress={jest.fn()}
        onButtonPress={jest.fn()}
      />,
    );

    expect(mockMoneyFormatFiat).toHaveBeenCalledWith(
      expect.any(BigNumber),
      'usd',
    );
  });

  it('renders the real balance and projected values when privacyMode is false', () => {
    const { getByTestId } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        apyDecimal={0.2}
        onCardPress={jest.fn()}
        onButtonPress={jest.fn()}
        privacyMode={false}
      />,
    );

    expect(
      getByTestId(PotentialEarningsTokenRowTestIds.BALANCE),
    ).toHaveTextContent('$5000.00');
    expect(
      getByTestId(PotentialEarningsTokenRowTestIds.PROJECTED),
    ).toHaveTextContent('+$1000.00');
  });

  it('masks the balance and projected values when privacyMode is true', () => {
    const { getByTestId } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        apyDecimal={0.2}
        onCardPress={jest.fn()}
        onButtonPress={jest.fn()}
        privacyMode
      />,
    );

    expect(
      getByTestId(PotentialEarningsTokenRowTestIds.BALANCE),
    ).toHaveTextContent('•'.repeat(9));
    expect(
      getByTestId(PotentialEarningsTokenRowTestIds.PROJECTED),
    ).toHaveTextContent('•'.repeat(6));
  });
});
