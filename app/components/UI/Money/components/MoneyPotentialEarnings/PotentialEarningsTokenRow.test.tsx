import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PotentialEarningsTokenRow from './PotentialEarningsTokenRow';
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

describe('PotentialEarningsTokenRow', () => {
  it('renders the token symbol', () => {
    const { getByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        projectedMultiplier={0.2}
        onPress={jest.fn()}
      />,
    );

    expect(getByText('USDC')).toBeOnTheScreen();
  });

  it('renders the token fiat balance', () => {
    const { getByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        projectedMultiplier={0.2}
        onPress={jest.fn()}
      />,
    );

    expect(getByText('$5,000.00')).toBeOnTheScreen();
  });

  it('renders projected earnings when multiplier produces a positive value', () => {
    const { getByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        projectedMultiplier={0.2}
        onPress={jest.fn()}
      />,
    );

    expect(getByText('+$1,000.00')).toBeOnTheScreen();
  });

  it('hides projected earnings when multiplier is zero', () => {
    const { queryByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        projectedMultiplier={0}
        onPress={jest.fn()}
      />,
    );

    expect(queryByText(/^\+\$/)).toBeNull();
  });

  it('renders the "No MetaMask fee" tag when hasSubsidizedFee is true', () => {
    const { getByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee
        projectedMultiplier={0.2}
        onPress={jest.fn()}
      />,
    );

    expect(
      getByText(strings('money.potential_earnings.no_fee')),
    ).toBeOnTheScreen();
  });

  it('hides the "No MetaMask fee" tag when hasSubsidizedFee is false', () => {
    const { queryByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        projectedMultiplier={0.2}
        onPress={jest.fn()}
      />,
    );

    expect(
      queryByText(strings('money.potential_earnings.no_fee')),
    ).not.toBeOnTheScreen();
  });

  it('renders the Convert button', () => {
    const { getByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        projectedMultiplier={0.2}
        onPress={jest.fn()}
      />,
    );

    expect(
      getByText(strings('money.potential_earnings.convert')),
    ).toBeOnTheScreen();
  });

  it('calls onPress when the Convert button is pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        projectedMultiplier={0.2}
        onPress={mockOnPress}
      />,
    );

    fireEvent.press(getByText(strings('money.potential_earnings.convert')));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPress when the row pressable area is pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <PotentialEarningsTokenRow
        token={MOCK_USDC}
        hasSubsidizedFee={false}
        projectedMultiplier={0.2}
        onPress={mockOnPress}
      />,
    );

    fireEvent.press(getByText('USDC'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
