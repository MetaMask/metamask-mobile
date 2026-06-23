import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { usePerpsActivityItems } from './usePerpsActivityItems';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  usePerpsConnection,
  usePerpsTransactionHistory,
} from '../../../UI/Perps/hooks';
import {
  FillType,
  type PerpsTransaction,
} from '../../../UI/Perps/types/transactionHistory';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupEvmInternalAccount: jest.fn(),
  }),
);

jest.mock('../../../UI/Perps/hooks', () => ({
  usePerpsConnection: jest.fn(),
  usePerpsTransactionHistory: jest.fn(),
}));

jest.mock('@metamask/perps-controller', () => ({
  ARBITRUM_MAINNET_CAIP_CHAIN_ID: 'eip155:42161',
  formatAccountToCaipAccountId: jest.fn(
    (address: string, chainId: string) => `${chainId}:${address}`,
  ),
}));

jest.mock('@metamask/perps-controller/constants/hyperLiquidConfig', () => ({
  USDC_ARBITRUM_MAINNET_ADDRESS: '0xUSDC',
}));

const address = '0x1234567890123456789012345678901234567890';

const baseTx = (overrides: Partial<PerpsTransaction>): PerpsTransaction =>
  ({
    id: 'tx-id',
    type: 'trade',
    category: 'position_open',
    title: '',
    subtitle: '',
    timestamp: 1,
    asset: 'ETH',
    ...overrides,
  }) as PerpsTransaction;

const openLongTx = baseTx({
  id: 'trade-open-long',
  type: 'trade',
  category: 'position_open',
  timestamp: 300,
  fill: {
    shortTitle: 'Opened long',
    amount: '-$43.99',
    amountNumber: 43.99,
    isPositive: false,
    size: '1',
    entryPrice: '0',
    points: '0',
    pnl: '0',
    fee: '0',
    action: 'Opened',
    feeToken: 'USDC',
    fillType: FillType.Standard,
  },
});

const closeLongLiquidatedTx = baseTx({
  id: 'trade-close-long-liq',
  type: 'trade',
  category: 'position_close',
  timestamp: 250,
  fill: {
    shortTitle: 'Closed long',
    amount: '-$400',
    amountNumber: 400,
    isPositive: false,
    size: '1',
    entryPrice: '0',
    points: '0',
    pnl: '0',
    fee: '0',
    action: 'Closed',
    feeToken: 'USDC',
    fillType: FillType.Liquidation,
  },
});

const receivedFundingTx = baseTx({
  id: 'funding-received',
  type: 'funding',
  category: 'funding_fee',
  timestamp: 200,
  fundingAmount: {
    isPositive: true,
    fee: '+$1.50',
    feeNumber: 1.5,
    rate: '0.0001',
  },
});

const depositTx = baseTx({
  id: 'deposit-1',
  type: 'deposit',
  category: 'deposit',
  timestamp: 100,
  depositWithdrawal: {
    amount: '$100',
    amountNumber: 100,
    isPositive: true,
    asset: 'USDC',
    txHash: '0xdeposithash',
    status: 'completed',
    type: 'deposit',
  },
});

// Order contents are irrelevant — the adapter drops every `type: 'order'`
// entry, so a minimal fixture is enough to assert it is filtered out.
const openOrderTx = baseTx({
  id: 'order-1',
  type: 'order',
  category: 'limit_order',
  timestamp: 50,
});

const setHistory = (
  transactions: PerpsTransaction[],
  overrides: Partial<ReturnType<typeof usePerpsTransactionHistory>> = {},
) => {
  (usePerpsTransactionHistory as jest.Mock).mockReturnValue({
    transactions,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    loadMoreFunding: jest.fn(),
    hasFundingMore: false,
    isFetchingMoreFunding: false,
    ...overrides,
  });
};

describe('usePerpsActivityItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePerpsConnection as jest.Mock).mockReturnValue({ isConnected: true });
    (useSelector as unknown as jest.Mock).mockImplementation((selector) => {
      switch (selector) {
        case selectSelectedAccountGroupEvmInternalAccount:
          return { address };
        default:
          return undefined;
      }
    });
    setHistory([]);
  });

  it('maps trades, funding, and deposits onto the Arbitrum activity chainId', () => {
    setHistory([
      openLongTx,
      closeLongLiquidatedTx,
      receivedFundingTx,
      depositTx,
    ]);

    const { result } = renderHook(() => usePerpsActivityItems());

    expect(
      result.current.items.every((i) => i.chainId === 'eip155:42161'),
    ).toBe(true);
  });

  it('maps an open long trade with out-direction USD amount and position leg', () => {
    setHistory([openLongTx]);

    const { result } = renderHook(() => usePerpsActivityItems());

    expect(result.current.items).toEqual([
      {
        type: 'perpsOpenLong',
        chainId: 'eip155:42161',
        status: 'success',
        timestamp: 300,
        raw: { type: 'perpsTransaction', data: openLongTx },
        hash: 'trade-open-long',
        data: {
          token: {
            amount: '43.99',
            symbol: 'USD',
            assetId: undefined,
            direction: 'out',
          },
          sourceToken: { amount: '1', symbol: 'ETH', direction: 'in' },
        },
      },
    ]);
  });

  it('derives the liquidation close kind from fillType', () => {
    setHistory([closeLongLiquidatedTx]);

    const { result } = renderHook(() => usePerpsActivityItems());

    // Fixture PnL is negative (isPositive: false) — sign follows the amount.
    expect(result.current.items[0]).toMatchObject({
      type: 'perpsCloseLongLiquidated',
      data: { token: { direction: 'out' } },
    });
  });

  it('maps positive funding to a received-fees in-direction item', () => {
    setHistory([receivedFundingTx]);

    const { result } = renderHook(() => usePerpsActivityItems());

    expect(result.current.items[0]).toMatchObject({
      type: 'perpsReceivedFundingFees',
      hash: 'funding-received',
      data: {
        token: { amount: '1.5', direction: 'in' },
      },
    });
  });

  it('maps a completed deposit to perpsAddFunds using the txHash and ledger asset', () => {
    setHistory([depositTx]);

    const { result } = renderHook(() => usePerpsActivityItems());

    expect(result.current.items[0]).toMatchObject({
      type: 'perpsAddFunds',
      status: 'success',
      hash: '0xdeposithash',
      data: {
        token: { amount: '100', symbol: 'USDC', direction: 'in' },
      },
    });
  });

  it('drops open orders and other non-history entries', () => {
    setHistory([openOrderTx]);

    const { result } = renderHook(() => usePerpsActivityItems());

    expect(result.current.items).toEqual([]);
  });

  it('passes through loading, error, and refetch from the history hook', () => {
    const refetch = jest.fn();
    setHistory([], { isLoading: true, error: 'boom', refetch });

    const { result } = renderHook(() => usePerpsActivityItems());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe('boom');
    expect(result.current.refetch).toBe(refetch);
  });

  it('maps funding pagination onto loadMore/hasMore and loadMore fetches more funding', async () => {
    const loadMoreFunding = jest.fn(() => Promise.resolve());
    setHistory([], {
      loadMoreFunding,
      hasFundingMore: true,
      isFetchingMoreFunding: false,
    });

    const { result } = renderHook(() => usePerpsActivityItems());

    expect(result.current.hasMore).toBe(true);
    expect(result.current.isFetchingMore).toBe(false);

    await result.current.loadMore();
    expect(loadMoreFunding).toHaveBeenCalledTimes(1);
  });

  it('loadMore is a no-op when no more funding is available', async () => {
    const loadMoreFunding = jest.fn(() => Promise.resolve());
    setHistory([], {
      loadMoreFunding,
      hasFundingMore: false,
      isFetchingMoreFunding: false,
    });

    const { result } = renderHook(() => usePerpsActivityItems());

    await result.current.loadMore();
    expect(loadMoreFunding).not.toHaveBeenCalled();
  });

  it('skips the initial fetch until the perps connection is established', () => {
    (usePerpsConnection as jest.Mock).mockReturnValue({ isConnected: false });

    renderHook(() => usePerpsActivityItems());

    expect(usePerpsTransactionHistory).toHaveBeenCalledWith(
      expect.objectContaining({ skipInitialFetch: true }),
    );
  });

  it('builds the CAIP account id on the Arbitrum perps chain, not the selected chain', () => {
    setHistory([]);

    renderHook(() => usePerpsActivityItems());

    // accountId is always scoped to the Arbitrum perps chain (eip155:42161),
    // independent of the user's selected network.
    expect(usePerpsTransactionHistory).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: `eip155:42161:${address}` }),
    );
  });

  it('passes an undefined accountId when no EVM account is selected', () => {
    (useSelector as unknown as jest.Mock).mockImplementation((selector) => {
      switch (selector) {
        case selectSelectedAccountGroupEvmInternalAccount:
          return undefined;
        default:
          return undefined;
      }
    });

    renderHook(() => usePerpsActivityItems());

    expect(usePerpsTransactionHistory).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: undefined }),
    );
  });
});
