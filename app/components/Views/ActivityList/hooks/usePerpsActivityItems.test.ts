import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { InitializationState } from '@metamask/perps-controller';
import { usePerpsActivityItems } from './usePerpsActivityItems';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  selectPerpsInitializationState,
  selectPerpsNetwork,
} from '../../../UI/Perps/selectors/perpsController';
// eslint-disable-next-line import-x/no-restricted-paths
import { usePerpsActivityQuery } from '../../ActivityDetails/hooks/usePerpsActivityQuery';
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

jest.mock('../../../UI/Perps/selectors/perpsController', () => ({
  selectPerpsInitializationState: jest.fn(),
  selectPerpsNetwork: jest.fn(),
}));

// eslint-disable-next-line import-x/no-restricted-paths
jest.mock('../../ActivityDetails/hooks/usePerpsActivityQuery', () => ({
  usePerpsActivityQuery: jest.fn(),
}));

jest.mock('@metamask/perps-controller', () => ({
  ARBITRUM_MAINNET_CAIP_CHAIN_ID: 'eip155:42161',
  InitializationState: {
    Initialized: 'initialized',
    Uninitialized: 'uninitialized',
  },
  formatAccountToCaipAccountId: jest.fn(
    (address: string, chainReference: string) =>
      `eip155:${chainReference}:${address}`,
  ),
}));

jest.mock('@metamask/perps-controller/constants/hyperLiquidConfig', () => ({
  getCaipChainId: (isTestnet: boolean) =>
    isTestnet ? 'eip155:421614' : 'eip155:42161',
  USDC_ARBITRUM_MAINNET_ADDRESS: '0xUSDC',
  USDC_ARBITRUM_TESTNET_ADDRESS: '0xUSDCT',
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

const openOrderTx = baseTx({
  id: 'order-1',
  type: 'order',
  category: 'limit_order',
  timestamp: 50,
});

let initializationState = InitializationState.Initialized;

const setQuery = (
  transactions: PerpsTransaction[],
  overrides: Record<string, unknown> = {},
) => {
  (usePerpsActivityQuery as jest.Mock).mockReturnValue({
    transactions,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    ...overrides,
  });
};

describe('usePerpsActivityItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    initializationState = InitializationState.Initialized;
    (
      selectSelectedAccountGroupEvmInternalAccount as unknown as jest.Mock
    ).mockReturnValue({ address });
    (useSelector as unknown as jest.Mock).mockImplementation((selector) => {
      if (selector === selectPerpsInitializationState) {
        return initializationState;
      }
      if (selector === selectPerpsNetwork) {
        return 'mainnet';
      }
      return selector({});
    });
    setQuery([]);
  });

  it('maps trades, funding, and deposits onto the Arbitrum activity chainId', () => {
    setQuery([openLongTx, closeLongLiquidatedTx, receivedFundingTx, depositTx]);

    const { result } = renderHook(() => usePerpsActivityItems());

    expect(
      result.current.items.every((i) => i.chainId === 'eip155:42161'),
    ).toBe(true);
  });

  it('maps an open long trade with out-direction USD amount and position leg', () => {
    setQuery([openLongTx]);

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
    setQuery([closeLongLiquidatedTx]);

    const { result } = renderHook(() => usePerpsActivityItems());

    expect(result.current.items[0]).toMatchObject({
      type: 'perpsCloseLongLiquidated',
      data: { token: { direction: 'out' } },
    });
  });

  it('maps positive funding to a received-fees in-direction item', () => {
    setQuery([receivedFundingTx]);

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
    setQuery([depositTx]);

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
    setQuery([openOrderTx]);

    const { result } = renderHook(() => usePerpsActivityItems());

    expect(result.current.items).toEqual([]);
  });

  it('passes through loading, error, and refetch from the query', async () => {
    const refetch = jest.fn();
    setQuery([], { isLoading: true, error: new Error('boom'), refetch });

    const { result } = renderHook(() => usePerpsActivityItems());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe('boom');
    await result.current.refetch();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('maps funding pagination onto loadMore/hasMore and loadMore fetches the next page', async () => {
    const fetchNextPage = jest.fn(() => Promise.resolve());
    setQuery([], {
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    const { result } = renderHook(() => usePerpsActivityItems());

    expect(result.current.hasMore).toBe(true);
    expect(result.current.isFetchingMore).toBe(false);

    await result.current.loadMore();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('loadMore is a no-op when no more funding is available', async () => {
    const fetchNextPage = jest.fn(() => Promise.resolve());
    setQuery([], {
      fetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { result } = renderHook(() => usePerpsActivityItems());

    await result.current.loadMore();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('builds the CAIP account id on the Arbitrum perps chain, not the selected chain', () => {
    setQuery([]);

    renderHook(() => usePerpsActivityItems());

    expect(usePerpsActivityQuery).toHaveBeenCalledWith(
      `eip155:42161:${address}`,
      true,
    );
  });

  it('passes an undefined accountId when no EVM account is selected', () => {
    (
      selectSelectedAccountGroupEvmInternalAccount as unknown as jest.Mock
    ).mockReturnValue(undefined);

    renderHook(() => usePerpsActivityItems());

    expect(usePerpsActivityQuery).toHaveBeenCalledWith(undefined, true);
  });
});
