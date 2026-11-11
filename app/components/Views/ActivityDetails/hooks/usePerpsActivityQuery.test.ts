import { createElement, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePerpsActivityQuery } from './usePerpsActivityQuery';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getActiveProviderOrNull: jest.fn(),
      getOrderFills: jest.fn(),
      getOrders: jest.fn(),
      getFunding: jest.fn(),
    },
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const controller = Engine.context.PerpsController as unknown as {
  getActiveProviderOrNull: jest.Mock;
  getOrderFills: jest.Mock;
  getOrders: jest.Mock;
  getFunding: jest.Mock;
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
const wrapper = ({ children }: PropsWithChildren) =>
  createElement(QueryClientProvider, { client: queryClient }, children);

describe('usePerpsActivityQuery', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
    (useSelector as unknown as jest.Mock).mockReturnValue([]);
    const provider = {
      getUserHistory: jest.fn().mockResolvedValue([]),
    };
    controller.getActiveProviderOrNull.mockReturnValue(provider);
    controller.getOrderFills.mockResolvedValue([]);
    controller.getOrders.mockResolvedValue([]);
    controller.getFunding.mockResolvedValue([]);
  });

  it('returns the fetched activity transactions when enabled', async () => {
    controller.getActiveProviderOrNull().getUserHistory.mockResolvedValue([
      {
        id: 'deposit1',
        timestamp: 1640995200000,
        type: 'deposit',
        amount: '1000',
        asset: 'USDC',
        status: 'completed',
        txHash: '0x123',
        details: {},
      },
    ]);

    const { result } = renderHook(
      () => usePerpsActivityQuery('eip155:42161:0xabc', true),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0]).toMatchObject({
      id: 'deposit-deposit1',
      type: 'deposit',
    });
  });

  it('keeps both executions when two fills of one order share timestamp, size and price', async () => {
    // HyperLiquid does not document orderId + timestamp + size + price as identifying one
    // execution, so neither the query nor the transform may drop a fill for looking like
    // another: the row count, size, fee and PnL would all under-report the trade.
    const twinFill = {
      orderId: 'order-twin',
      symbol: 'ETH',
      side: 'B',
      size: '1.5',
      price: '3000',
      pnl: '0',
      direction: 'Open Long',
      fee: '0.1',
      feeToken: 'USDC',
      timestamp: 1700000000000,
    };
    controller.getOrderFills.mockResolvedValue([twinFill, { ...twinFill }]);

    const { result } = renderHook(
      () =>
        usePerpsActivityQuery('eip155:42161:0xabc', true, {
          fillDisplay: 'individual',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.transactions).toHaveLength(2);
    expect(new Set(result.current.transactions.map((tx) => tx.id)).size).toBe(
      2,
    );
  });
});
