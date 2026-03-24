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

const MOCK_USDC: AssetType = {
  name: 'USD Coin',
  symbol: 'USDC',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  decimals: 6,
  balanceInSelectedCurrency: '$5,000.00',
} as AssetType;

const MOCK_USDT: AssetType = {
  name: 'Tether',
  symbol: 'USDT',
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  chainId: '0x1',
  decimals: 6,
  balanceInSelectedCurrency: '$4,000.00',
} as AssetType;

const MOCK_DAI: AssetType = {
  name: 'Dai',
  symbol: 'DAI',
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  chainId: '0x1',
  decimals: 18,
  balanceInSelectedCurrency: '$1,000.00',
} as AssetType;

const MOCK_WBTC: AssetType = {
  name: 'Wrapped Bitcoin',
  symbol: 'WBTC',
  address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  chainId: '0x1',
  decimals: 8,
  balanceInSelectedCurrency: '$3,000.00',
} as AssetType;

const MOCK_LINK: AssetType = {
  name: 'Chainlink',
  symbol: 'LINK',
  address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  chainId: '0x1',
  decimals: 18,
  balanceInSelectedCurrency: '$2,000.00',
} as AssetType;

const MOCK_UNI: AssetType = {
  name: 'Uniswap',
  symbol: 'UNI',
  address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  chainId: '0x1',
  decimals: 18,
  balanceInSelectedCurrency: '$1,500.00',
} as AssetType;

const mockTokens: AssetType[] = [MOCK_USDC, MOCK_USDT, MOCK_DAI];

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
      MOCK_USDC,
      MOCK_USDT,
      MOCK_DAI,
      MOCK_WBTC,
      MOCK_LINK,
      MOCK_UNI,
    ];

    const { getByText, queryByText } = render(
      <MoneyPotentialEarnings tokens={sixTokens} />,
    );

    expect(getByText(MOCK_USDC.name)).toBeOnTheScreen();
    expect(getByText(MOCK_USDT.name)).toBeOnTheScreen();
    expect(getByText(MOCK_DAI.name)).toBeOnTheScreen();
    expect(getByText(MOCK_WBTC.name)).toBeOnTheScreen();
    expect(getByText(MOCK_LINK.name)).toBeOnTheScreen();
    expect(queryByText(MOCK_UNI.name)).not.toBeOnTheScreen();
  });
});
