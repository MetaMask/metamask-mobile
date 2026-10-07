import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import TokenDetailsPositionLine from './TokenDetailsPositionLine';
import {
  convertUsdToFiat,
  useTraderPosition,
  useUnrealizedPnl,
  useUsdToFiatRate,
  type TraderPosition,
} from '../../SocialFeed/TraderPositionPnl';

jest.mock('../../SocialFeed/TraderPositionPnl', () => ({
  useUnrealizedPnl: jest.fn(),
  useTraderPosition: jest.fn(),
  useUsdToFiatRate: jest.fn(),
  useOpenPositionId: jest.fn(() => ({
    position: null,
    isResolving: false,
  })),
  convertUsdToFiat: jest.fn(),
  formatFiat: jest.fn((amount: number) =>
    amount < 0 ? `-$${Math.abs(amount).toFixed(2)}` : `+$${amount.toFixed(2)}`,
  ),
}));

const mockUseUnrealizedPnl = useUnrealizedPnl as jest.MockedFunction<
  typeof useUnrealizedPnl
>;
const mockUseTraderPosition = useTraderPosition as jest.MockedFunction<
  typeof useTraderPosition
>;
const mockUseUsdToFiatRate = useUsdToFiatRate as jest.MockedFunction<
  typeof useUsdToFiatRate
>;

const position = {
  positionId: 'pos-1',
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x1',
  chain: 'ethereum',
  isOpen: true,
  positionAmount: 2,
  costBasis: 100,
  currentValueUSD: 150,
  realizedPnl: 10,
  pnlValueUsd: 60,
  pnlPercent: null,
  boughtUsd: 100,
  soldUsd: 0,
  perpPositionType: null,
  perpLeverage: null,
  positionAmountWithLeverage: null,
  costBasisWithLeverage: null,
  marginUsd: null,
  trades: [{ timestamp: Date.now() / 1000 - 3600 }],
  lastTradeAt: Date.now(),
} satisfies TraderPosition;

describe('TokenDetailsPositionLine', () => {
  beforeEach(() => {
    mockUseUsdToFiatRate.mockReturnValue({ currency: 'usd', rate: 1 });
    (convertUsdToFiat as jest.Mock).mockImplementation((usd: number) => ({
      amount: usd,
      currency: 'usd',
      fellBackToUsd: false,
    }));
    mockUseTraderPosition.mockReturnValue({
      position: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseUnrealizedPnl.mockReturnValue({
      valueFormatted: null,
      percentFormatted: null,
      isProfit: false,
      currency: 'usd',
      isLoading: false,
      error: null,
      hasPosition: false,
      fellBackToUsd: false,
    });
  });

  it('shows the wallet value without PnL when there is no position', () => {
    const { getByText, queryByText } = render(
      <TokenDetailsPositionLine balanceFiatUsd={50} />,
    );

    expect(getByText('Your position')).toBeTruthy();
    expect(getByText('$50.00')).toBeTruthy();
    expect(queryByText('Unrealised PNL')).toBeNull();
  });

  it('shows unrealised PnL and expands the position details', () => {
    mockUseTraderPosition.mockReturnValue({
      position,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseUnrealizedPnl.mockReturnValue({
      valueFormatted: '+$50.00',
      percentFormatted: '+50.00%',
      isProfit: true,
      currency: 'usd',
      isLoading: false,
      error: null,
      hasPosition: true,
      fellBackToUsd: false,
    });

    const { getByText, getByTestId } = render(
      <TokenDetailsPositionLine positionId="pos-1" balanceFiatUsd={50} />,
    );

    expect(getByText('Unrealised PNL')).toBeTruthy();
    expect(getByText('+$50.00 (+50.00%)')).toBeTruthy();

    fireEvent.press(getByTestId('token-details-position-line'));

    expect(getByText('Realized')).toBeTruthy();
    expect(getByText('Unrealized')).toBeTruthy();
    expect(getByText('Average cost')).toBeTruthy();
    expect(getByText('Hold time')).toBeTruthy();
  });
});
