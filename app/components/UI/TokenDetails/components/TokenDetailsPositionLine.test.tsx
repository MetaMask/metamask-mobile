import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import TokenDetailsPositionLine from './TokenDetailsPositionLine';
import {
  convertUsdToFiat,
  useTraderPosition,
  useUnrealizedPnl,
  useUsdToFiatRate,
  type TraderPosition,
} from '../TraderPositionPnl';

jest.mock('../TraderPositionPnl', () => ({
  useUnrealizedPnl: jest.fn(),
  useTraderPosition: jest.fn(),
  useUsdToFiatRate: jest.fn(),
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
      value: usd,
      currency: 'USD',
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

  it('does not announce a button when there is no position to expand', () => {
    const { getByTestId } = render(
      <TokenDetailsPositionLine balanceFiatUsd={50} />,
    );

    const row = getByTestId('token-details-position-line');
    expect(row.props.accessibilityRole).toBeUndefined();
    expect(row.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    expect(row.props.accessibilityState?.expanded).toBeUndefined();
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
    const row = getByTestId('token-details-position-line');
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityState).toEqual(
      expect.objectContaining({ expanded: false }),
    );

    fireEvent.press(row);

    expect(
      getByTestId('token-details-position-line').props.accessibilityState,
    ).toEqual(expect.objectContaining({ expanded: true }));
    expect(getByText('Realized')).toBeTruthy();
    expect(getByText('Unrealized')).toBeTruthy();
    expect(getByText('Average cost')).toBeTruthy();
    expect(getByText('Hold time')).toBeTruthy();
  });
});
