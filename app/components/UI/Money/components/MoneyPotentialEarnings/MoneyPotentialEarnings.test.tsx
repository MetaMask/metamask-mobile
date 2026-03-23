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

const createMockToken = (overrides: Partial<AssetType> = {}): AssetType =>
  ({
    name: 'USD Coin',
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: '0x1',
    decimals: 6,
    balanceInSelectedCurrency: '$5,000.00',
    ...overrides,
  }) as AssetType;

const mockTokens: AssetType[] = [
  createMockToken({ name: 'USD Coin', symbol: 'USDC' }),
  createMockToken({
    name: 'Tether',
    symbol: 'USDT',
    balanceInSelectedCurrency: '$4,000.00',
  }),
  createMockToken({
    name: 'Dai',
    symbol: 'DAI',
    balanceInSelectedCurrency: '$1,000.00',
  }),
];

describe('MoneyPotentialEarnings', () => {
  it('renders the section title when tokens are provided', () => {
    const { getByText } = render(
      <MoneyPotentialEarnings tokens={mockTokens} />,
    );

    expect(
      getByText(strings('money.potential_earnings.title')),
    ).toBeOnTheScreen();
  });

  it('renders the potential earnings amount', () => {
    const { getByTestId } = render(
      <MoneyPotentialEarnings tokens={mockTokens} />,
    );

    expect(getByTestId(MoneyPotentialEarningsTestIds.AMOUNT)).toBeOnTheScreen();
  });

  it('renders token rows from the provided tokens prop', () => {
    const { getByText } = render(
      <MoneyPotentialEarnings tokens={mockTokens} />,
    );

    expect(getByText('USD Coin')).toBeOnTheScreen();
    expect(getByText('Tether')).toBeOnTheScreen();
    expect(getByText('Dai')).toBeOnTheScreen();
  });

  it('renders the See potential earnings CTA button', () => {
    const { getByTestId } = render(
      <MoneyPotentialEarnings tokens={mockTokens} />,
    );

    expect(
      getByTestId(MoneyPotentialEarningsTestIds.SEE_EARNINGS_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls onSeeEarningsPress when CTA button is pressed', () => {
    const mockSeeEarnings = jest.fn();
    const { getByTestId } = render(
      <MoneyPotentialEarnings
        tokens={mockTokens}
        onSeeEarningsPress={mockSeeEarnings}
      />,
    );

    fireEvent.press(
      getByTestId(MoneyPotentialEarningsTestIds.SEE_EARNINGS_BUTTON),
    );

    expect(mockSeeEarnings).toHaveBeenCalledTimes(1);
  });

  it('calls onTokenAddPress with token name when Convert button is pressed', () => {
    const mockTokenAdd = jest.fn();
    const { getAllByText } = render(
      <MoneyPotentialEarnings
        tokens={mockTokens}
        onTokenAddPress={mockTokenAdd}
      />,
    );

    const convertButtons = getAllByText(
      strings('money.potential_earnings.convert'),
    );
    fireEvent.press(convertButtons[0]);

    expect(mockTokenAdd).toHaveBeenCalledWith('USD Coin');
  });

  it('returns null when tokens array is empty', () => {
    const { queryByTestId } = render(<MoneyPotentialEarnings tokens={[]} />);

    expect(
      queryByTestId(MoneyPotentialEarningsTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('limits displayed tokens to a maximum of 5', () => {
    const sixTokens = [
      createMockToken({ name: 'Token1', symbol: 'T1' }),
      createMockToken({ name: 'Token2', symbol: 'T2' }),
      createMockToken({ name: 'Token3', symbol: 'T3' }),
      createMockToken({ name: 'Token4', symbol: 'T4' }),
      createMockToken({ name: 'Token5', symbol: 'T5' }),
      createMockToken({ name: 'Token6', symbol: 'T6' }),
    ];

    const { getByText, queryByText } = render(
      <MoneyPotentialEarnings tokens={sixTokens} />,
    );

    expect(getByText('Token5')).toBeOnTheScreen();
    expect(queryByText('Token6')).not.toBeOnTheScreen();
  });
});
