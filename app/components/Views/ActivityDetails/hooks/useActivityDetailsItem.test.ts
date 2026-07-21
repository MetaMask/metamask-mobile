import { renderHook } from '@testing-library/react-hooks';
import {
  mapRampOrder,
  type ActivityListItem,
} from '../../../../util/activity-adapters';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import { useActivityDetailsItem } from './useActivityDetailsItem';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): mirrors the resolver hook's data sources; route-isolation backlog */
import { useLocalActivityItems } from '../../ActivityList/hooks/useLocalActivityItems';
import { useRampActivityItems } from '../../ActivityList/hooks/useRampActivityItems';
import { useTransactionsQuery } from '../../ActivityList/useTransactionsQuery';
import { mapNonEvmTransactions } from '../../ActivityList/helpers/transformations';
/* eslint-enable import-x/no-restricted-paths */

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => ({ transactions: [] })),
}));
jest.mock('../../ActivityList/hooks/useLocalActivityItems');
jest.mock('../../ActivityList/hooks/useRampActivityItems');
jest.mock('../../ActivityList/useTransactionsQuery');
jest.mock('../../ActivityList/helpers/transformations', () => ({
  mapNonEvmTransactions: jest.fn(() => []),
}));

const useLocalActivityItemsMock = jest.mocked(useLocalActivityItems);
const useRampActivityItemsMock = jest.mocked(useRampActivityItems);
const useTransactionsQueryMock = jest.mocked(useTransactionsQuery);
const mapNonEvmTransactionsMock = jest.mocked(mapNonEvmTransactions);

const rampOrder: FiatOrder = {
  id: 'ramp-order-id',
  provider: FIAT_ORDER_PROVIDERS.RAMPS_V2,
  createdAt: 1,
  amount: '6.27',
  fee: '1.26',
  cryptoAmount: '5.01',
  currency: 'USD',
  cryptocurrency: 'mUSD',
  state: FIAT_ORDER_STATES.COMPLETED,
  account: '0x1234567890abcdef1234567890abcdef12345678',
  network: 'eip155:59144',
  txHash: '0xramp',
  excludeFromPurchases: false,
  orderType: OrderOrderTypeEnum.Buy,
  data: {},
} as FiatOrder;

function makeItem(
  partial: Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>,
): ActivityListItem {
  return {
    chainId: 'eip155:1',
    status: 'success',
    timestamp: 1,
    data: {},
    ...partial,
  } as ActivityListItem;
}

function setSources({
  local = [],
  confirmed = [],
  nonEvm = [],
  ramp = [],
}: {
  local?: ActivityListItem[];
  confirmed?: ActivityListItem[];
  nonEvm?: ActivityListItem[];
  ramp?: ActivityListItem[];
}) {
  useLocalActivityItemsMock.mockReturnValue(local);
  useRampActivityItemsMock.mockReturnValue(ramp);
  useTransactionsQueryMock.mockReturnValue({
    data: { pages: [{ data: confirmed }] },
  } as unknown as ReturnType<typeof useTransactionsQuery>);
  mapNonEvmTransactionsMock.mockReturnValue(nonEvm);
}

describe('useActivityDetailsItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns undefined when no identifier is provided', () => {
    setSources({});
    const { result } = renderHook(() => useActivityDetailsItem(undefined));
    expect(result.current).toBeUndefined();
  });

  it('resolves a local item by hash (case-insensitive)', () => {
    const local = makeItem({ type: 'send', hash: '0xABC' });
    setSources({ local: [local] });

    const { result } = renderHook(() => useActivityDetailsItem('0xabc'));
    expect(result.current).toBe(local);
  });

  it('resolves a non-EVM item when no local/api item matches', () => {
    const nonEvm = makeItem({ type: 'receive', hash: '0xsol' });
    setSources({ nonEvm: [nonEvm] });

    const { result } = renderHook(() => useActivityDetailsItem('0xsol'));
    expect(result.current).toBe(nonEvm);
  });

  it('prefers the API item over a generic local contractInteraction', () => {
    const local = makeItem({ type: 'contractInteraction', hash: '0xdef' });
    const api = makeItem({ type: 'swap', hash: '0xdef' });
    setSources({ local: [local], confirmed: [api] });

    const { result } = renderHook(() => useActivityDetailsItem('0xdef'));
    expect(result.current).toBe(api);
  });

  it('prefers the API swap over a local swapIncomplete (destination unresolved on-device)', () => {
    const local = makeItem({ type: 'swapIncomplete', hash: '0xswap' });
    const api = makeItem({ type: 'swap', hash: '0xswap' });
    setSources({ local: [local], confirmed: [api] });

    const { result } = renderHook(() => useActivityDetailsItem('0xswap'));
    expect(result.current).toBe(api);
  });

  it('falls back to the local swapIncomplete when there is no API copy', () => {
    const local = makeItem({ type: 'swapIncomplete', hash: '0xonly' });
    setSources({ local: [local] });

    const { result } = renderHook(() => useActivityDetailsItem('0xonly'));
    expect(result.current).toBe(local);
  });

  it('keeps the local spending-cap copy when only it carries the cap amount', () => {
    const local = makeItem({
      type: 'approveSpendingCap',
      hash: '0xcap',
      data: { token: { direction: 'out', amount: '100000' } },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    const api = makeItem({ type: 'approveSpendingCap', hash: '0xcap' });
    setSources({ local: [local], confirmed: [api] });

    const { result } = renderHook(() => useActivityDetailsItem('0xcap'));
    expect(result.current).toBe(local);
  });

  it('prefers the API spending-cap copy when the local copy also lacks an amount', () => {
    const local = makeItem({ type: 'approveSpendingCap', hash: '0xnocap' });
    const api = makeItem({ type: 'approveSpendingCap', hash: '0xnocap' });
    setSources({ local: [local], confirmed: [api] });

    const { result } = renderHook(() => useActivityDetailsItem('0xnocap'));
    expect(result.current).toBe(api);
  });

  it('keeps the local item when it is already categorized and types differ', () => {
    const local = makeItem({ type: 'send', hash: '0xfff' });
    const api = makeItem({ type: 'contractInteraction', hash: '0xfff' });
    setSources({ local: [local], confirmed: [api] });

    const { result } = renderHook(() => useActivityDetailsItem('0xfff'));
    expect(result.current).toBe(local);
  });

  it('keeps the local item when only it carries a gas-token fee', () => {
    const local = makeItem({
      type: 'send',
      hash: '0xgas',
      data: {
        from: '0xfrom',
        to: '0xto',
        fees: [
          { type: 'gasToken', amount: '100', decimals: 6, symbol: 'USDT' },
        ],
      },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    const api = makeItem({
      type: 'send',
      hash: '0xgas',
      data: {
        from: '0xfrom',
        to: '0xto',
        fees: [{ type: 'base', amount: '21000', decimals: 18, symbol: 'ETH' }],
      },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    setSources({ local: [local], confirmed: [api] });

    const { result } = renderHook(() => useActivityDetailsItem('0xgas'));
    expect(result.current).toBe(local);
  });

  it('prefers a richer API send over a local contractInteraction that only has a gas-token fee', () => {
    const local = makeItem({
      type: 'contractInteraction',
      hash: '0xdegraded',
      data: {
        to: '0xto',
        fees: [
          { type: 'gasToken', amount: '100', decimals: 6, symbol: 'USDT' },
        ],
      },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    const api = makeItem({
      type: 'send',
      hash: '0xdegraded',
      data: {
        from: '0xfrom',
        to: '0xto',
        fees: [{ type: 'base', amount: '21000', decimals: 18, symbol: 'ETH' }],
      },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    setSources({ local: [local], confirmed: [api] });

    const { result } = renderHook(() => useActivityDetailsItem('0xdegraded'));
    expect(result.current).toBe(api);
  });

  it('resolves a local item by TransactionMeta id when the display hash changed', () => {
    const local = makeItem({
      type: 'send',
      hash: '0xnewhash',
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: { id: 'meta-1', hash: '0xnewhash' },
          initialTransaction: { id: 'meta-1', hash: '0xoldhash' },
        },
      },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    setSources({ local: [local] });

    const { result } = renderHook(() => useActivityDetailsItem('meta-1'));
    expect(result.current).toBe(local);
  });

  it('recovers a live local item via preloaded meta id after a hash mismatch', () => {
    const live = makeItem({
      type: 'send',
      hash: '0xnewhash',
      status: 'pending',
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: { id: 'meta-2', hash: '0xnewhash' },
          initialTransaction: { id: 'meta-2' },
        },
      },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    const preloaded = makeItem({
      type: 'send',
      hash: '0xoldhash',
      status: 'pending',
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: { id: 'meta-2', hash: '0xoldhash' },
          initialTransaction: { id: 'meta-2' },
        },
      },
      data: {
        from: '0xfrom',
        to: '0xto',
        fees: [
          { type: 'gasToken', amount: '100', decimals: 6, symbol: 'USDT' },
        ],
      },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    setSources({ local: [live] });

    const { result } = renderHook(() =>
      useActivityDetailsItem('0xoldhash', 'eip155:1', preloaded),
    );
    expect(result.current).toBe(live);
  });

  it('falls back to a preloaded local snapshot when live lookup misses', () => {
    const preloaded = makeItem({
      type: 'send',
      hash: '0xorphan',
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: { id: 'meta-orphan', hash: '0xorphan' },
          initialTransaction: { id: 'meta-orphan' },
        },
      },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    setSources({});

    const { result } = renderHook(() =>
      useActivityDetailsItem('meta-orphan', 'eip155:1', preloaded),
    );
    expect(result.current).toBe(preloaded);
  });

  it('prefers a preloaded local gas-token fee over a native-only API copy when live local misses', () => {
    const api = makeItem({
      type: 'send',
      hash: '0xshared',
      data: {
        from: '0xfrom',
        to: '0xto',
        fees: [{ type: 'base', amount: '21000', decimals: 18, symbol: 'ETH' }],
      },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    const preloaded = makeItem({
      type: 'send',
      hash: '0xshared',
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: { id: 'meta-gas', hash: '0xshared' },
          initialTransaction: { id: 'meta-gas' },
        },
      },
      data: {
        from: '0xfrom',
        to: '0xto',
        fees: [
          { type: 'gasToken', amount: '100', decimals: 6, symbol: 'USDT' },
        ],
      },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    setSources({ confirmed: [api] });

    const { result } = renderHook(() =>
      useActivityDetailsItem('meta-gas', 'eip155:1', preloaded),
    );
    expect(result.current).toBe(preloaded);
  });

  it('prefers the API copy over a preloaded local when the snapshot has no richer fees', () => {
    const api = makeItem({
      type: 'send',
      hash: '0xshared2',
      data: {
        from: '0xfrom',
        to: '0xto',
        fees: [{ type: 'base', amount: '21000', decimals: 18, symbol: 'ETH' }],
      },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    const preloaded = makeItem({
      type: 'send',
      hash: '0xshared2',
      raw: {
        type: 'localTransaction',
        data: {
          primaryTransaction: { id: 'meta-plain', hash: '0xshared2' },
          initialTransaction: { id: 'meta-plain' },
        },
      },
      data: {
        from: '0xfrom',
        to: '0xto',
        fees: [{ type: 'base', amount: '21000', decimals: 18, symbol: 'ETH' }],
      },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    setSources({ confirmed: [api] });

    const { result } = renderHook(() =>
      useActivityDetailsItem('meta-plain', 'eip155:1', preloaded),
    );
    expect(result.current).toBe(api);
  });

  it('returns the API item when there is no local match', () => {
    const api = makeItem({ type: 'swap', hash: '0xapi' });
    setSources({ confirmed: [api] });

    const { result } = renderHook(() => useActivityDetailsItem('0xAPI'));
    expect(result.current).toBe(api);
  });

  it('resolves the item matching the requested chainId when hashes collide across chains', () => {
    const mainnet = makeItem({
      type: 'send',
      hash: '0xdup',
      chainId: 'eip155:1',
    });
    const base = makeItem({
      type: 'send',
      hash: '0xdup',
      chainId: 'eip155:8453',
    });
    setSources({ confirmed: [mainnet, base] });

    const { result } = renderHook(() =>
      useActivityDetailsItem('0xdup', 'eip155:8453'),
    );
    expect(result.current).toBe(base);
  });

  it('resolves a Ramp item by hash from fiat orders', () => {
    const ramp = mapRampOrder({ order: rampOrder }) as ActivityListItem;
    setSources({ ramp: [ramp] });

    const { result } = renderHook(() =>
      useActivityDetailsItem('0xramp', 'eip155:59144'),
    );

    expect(result.current).toBe(ramp);
  });

  it('resolves a Ramp item by order id when a transaction hash is available', () => {
    const ramp = mapRampOrder({ order: rampOrder }) as ActivityListItem;
    setSources({ ramp: [ramp] });

    const { result } = renderHook(() =>
      useActivityDetailsItem('ramp-order-id', 'eip155:59144'),
    );

    expect(result.current).toBe(ramp);
  });

  it('resolves a preloaded domain item by hash without reading provider-backed sources', () => {
    const preloaded = makeItem({
      type: 'perpsOpenLong',
      chainId: 'eip155:42161',
      hash: 'perps-fill-1',
      raw: {
        type: 'perpsTransaction',
        data: {
          id: 'fill-1',
          type: 'trade',
          category: 'position_open',
          title: 'Opened long',
          subtitle: '0.0001 BTC',
          timestamp: 1,
          asset: 'BTC',
        },
      },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    setSources({});

    const { result } = renderHook(() =>
      useActivityDetailsItem('perps-fill-1', 'eip155:42161', preloaded),
    );

    expect(result.current).toBe(preloaded);
  });

  it('prefers a matching preloaded domain item over a local hash collision', () => {
    const local = makeItem({
      type: 'send',
      chainId: 'eip155:42161',
      hash: '0xshared',
    });
    const preloaded = makeItem({
      type: 'perpsAddFunds',
      chainId: 'eip155:42161',
      hash: '0xshared',
      raw: {
        type: 'perpsTransaction',
        data: {
          id: 'wallet-deposit-1',
          type: 'deposit',
          category: 'deposit',
          title: 'Account funded',
          subtitle: 'Completed',
          timestamp: 1,
          asset: 'USDC',
          depositWithdrawal: {
            amount: '+$1.00',
            amountNumber: 1,
            isPositive: true,
            asset: 'USDC',
            txHash: '0xshared',
            status: 'completed',
            type: 'deposit',
          },
        },
      },
    } as Partial<ActivityListItem> & Pick<ActivityListItem, 'type' | 'hash'>);
    setSources({ local: [local] });

    const { result } = renderHook(() =>
      useActivityDetailsItem('0xshared', 'eip155:42161', preloaded),
    );

    expect(result.current).toBe(preloaded);
  });
});
