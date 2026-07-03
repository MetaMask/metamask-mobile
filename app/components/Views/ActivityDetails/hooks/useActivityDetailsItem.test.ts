import { renderHook } from '@testing-library/react-hooks';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { useActivityDetailsItem } from './useActivityDetailsItem';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): mirrors the resolver hook's data sources; route-isolation backlog */
import { useLocalActivityItems } from '../../ActivityList/hooks/useLocalActivityItems';
import { useTransactionsQuery } from '../../ActivityList/useTransactionsQuery';
import { mapNonEvmTransactions } from '../../ActivityList/helpers/transformations';
/* eslint-enable import-x/no-restricted-paths */

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => ({ transactions: [] })),
}));
jest.mock('../../ActivityList/hooks/useLocalActivityItems');
jest.mock('../../ActivityList/useTransactionsQuery');
jest.mock('../../ActivityList/helpers/transformations', () => ({
  mapNonEvmTransactions: jest.fn(() => []),
}));

const useLocalActivityItemsMock = jest.mocked(useLocalActivityItems);
const useTransactionsQueryMock = jest.mocked(useTransactionsQuery);
const mapNonEvmTransactionsMock = jest.mocked(mapNonEvmTransactions);

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
}: {
  local?: ActivityListItem[];
  confirmed?: ActivityListItem[];
  nonEvm?: ActivityListItem[];
}) {
  useLocalActivityItemsMock.mockReturnValue(local);
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

  it('keeps the local item when it is already categorized and types differ', () => {
    const local = makeItem({ type: 'send', hash: '0xfff' });
    const api = makeItem({ type: 'contractInteraction', hash: '0xfff' });
    setSources({ local: [local], confirmed: [api] });

    const { result } = renderHook(() => useActivityDetailsItem('0xfff'));
    expect(result.current).toBe(local);
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
});
