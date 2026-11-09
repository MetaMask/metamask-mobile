import { useQuery } from '@metamask/react-data-query';
import type { CaipAssetType } from '@metamask/utils';
import { renderHook } from '@testing-library/react-native';
import {
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_3,
} from '../api/recurringOrders.mock';
import { useLatestOpenRecurringOrderForAsset } from './useLatestOpenRecurringOrderForAsset';

jest.mock('@metamask/react-data-query', () => ({
  useQuery: jest.fn(),
}));

const mockUseQuery = jest.mocked(useQuery);
const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
const ASSET_ID = 'eip155:1/slip44:60' satisfies CaipAssetType;

interface QueryState {
  data?: (typeof MOCK_RECURRING_OPEN_ORDER)[];
  isLoading: boolean;
  isError: boolean;
}

interface DisabledQueryCase {
  name: string;
  params: {
    walletAddress?: string;
    assetId?: CaipAssetType;
    enabled?: boolean;
  };
}

const DISABLED_QUERY_CASES = [
  {
    name: 'the lookup is inactive',
    params: {
      walletAddress: WALLET_ADDRESS,
      assetId: ASSET_ID,
      enabled: false,
    },
  },
  {
    name: 'the wallet is missing',
    params: { assetId: ASSET_ID },
  },
  {
    name: 'the asset is missing',
    params: { walletAddress: WALLET_ADDRESS },
  },
] satisfies DisabledQueryCase[];

function setupQuery(overrides: Partial<QueryState> = {}) {
  mockUseQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  } as never);
}

describe('useLatestOpenRecurringOrderForAsset', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setupQuery();
  });

  it('queries by normalized wallet and exact asset ID', () => {
    renderHook(() =>
      useLatestOpenRecurringOrderForAsset({
        walletAddress: WALLET_ADDRESS.toUpperCase(),
        assetId: ASSET_ID,
      }),
    );

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: [
        'RecurringOrdersDataService:getRecurringOrdersByAsset',
        {
          walletAddress: WALLET_ADDRESS,
          assetId: ASSET_ID,
        },
      ],
      enabled: true,
    });
  });

  it.each(DISABLED_QUERY_CASES)(
    'disables the query when $name',
    ({ params }) => {
      renderHook(() => useLatestOpenRecurringOrderForAsset(params));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    },
  );

  it('returns the first endpoint result', () => {
    setupQuery({
      data: [MOCK_RECURRING_OPEN_ORDER_3, MOCK_RECURRING_OPEN_ORDER],
    });

    const { result } = renderHook(() =>
      useLatestOpenRecurringOrderForAsset({
        walletAddress: WALLET_ADDRESS,
        assetId: ASSET_ID,
      }),
    );

    expect(result.current.order).toBe(MOCK_RECURRING_OPEN_ORDER_3);
  });

  it('returns no order for an empty response', () => {
    setupQuery({ data: [] });

    const { result } = renderHook(() =>
      useLatestOpenRecurringOrderForAsset({
        walletAddress: WALLET_ADDRESS,
        assetId: ASSET_ID,
      }),
    );

    expect(result.current.order).toBeUndefined();
  });

  it('returns no order while loading', () => {
    setupQuery({
      data: [MOCK_RECURRING_OPEN_ORDER],
      isLoading: true,
    });

    const { result } = renderHook(() =>
      useLatestOpenRecurringOrderForAsset({
        walletAddress: WALLET_ADDRESS,
        assetId: ASSET_ID,
      }),
    );

    expect(result.current.order).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('returns no stale order after an error', () => {
    setupQuery({
      data: [MOCK_RECURRING_OPEN_ORDER],
      isError: true,
    });

    const { result } = renderHook(() =>
      useLatestOpenRecurringOrderForAsset({
        walletAddress: WALLET_ADDRESS,
        assetId: ASSET_ID,
      }),
    );

    expect(result.current.order).toBeUndefined();
    expect(result.current.isError).toBe(true);
  });
});
