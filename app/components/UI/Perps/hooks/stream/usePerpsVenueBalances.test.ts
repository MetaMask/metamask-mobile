import { renderHook, waitFor } from '@testing-library/react-native';
import {
  type AccountState,
  type AccountAggregateMetadata,
} from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { usePerpsVenueBalances } from './usePerpsVenueBalances';
import { usePerpsLiveAccount } from './usePerpsLiveAccount';
import { usePerpsConnection } from '../usePerpsConnection';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      state: { perpsBalances: {} },
    },
  },
}));

jest.mock('./usePerpsLiveAccount', () => ({
  usePerpsLiveAccount: jest.fn(),
}));

jest.mock('../usePerpsConnection', () => ({
  usePerpsConnection: jest.fn(),
}));

const mockUsePerpsLiveAccount = usePerpsLiveAccount as jest.MockedFunction<
  typeof usePerpsLiveAccount
>;
const mockUsePerpsConnection = usePerpsConnection as jest.MockedFunction<
  typeof usePerpsConnection
>;

const directAccount = {
  totalBalance: '100',
  unrealizedPnl: '5',
  spendableBalance: '90',
  withdrawableBalance: '90',
} as unknown as AccountState;

const aggregatedAccount = {
  totalBalance: '150',
  unrealizedPnl: '8',
  spendableBalance: '140',
  withdrawableBalance: '140',
  providerStates: {
    hyperliquid: {
      status: 'available',
      providerId: 'hyperliquid',
      state: {
        totalBalance: '100',
        unrealizedPnl: '5',
        spendableBalance: '90',
        withdrawableBalance: '90',
      },
    },
    lighter: {
      status: 'available',
      providerId: 'lighter',
      state: {
        totalBalance: '50',
        unrealizedPnl: '3',
        spendableBalance: '50',
        withdrawableBalance: '50',
      },
    },
  },
} as unknown as AccountState;

const partialAggregate: AccountAggregateMetadata = {
  status: 'partial',
  availableProviders: ['hyperliquid'],
  unavailableProviders: ['lighter'],
  pendingProviders: [],
};

describe('usePerpsVenueBalances (TAT-4407)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsConnection.mockReturnValue({
      error: null,
      isConnecting: false,
      isInitialized: true,
      isConnected: true,
      connectionGeneration: 0,
    } as never);
  });

  it('returns one entry per providerStates venue plus the combined total', async () => {
    mockUsePerpsLiveAccount.mockReturnValue({
      account: aggregatedAccount,
      isInitialLoading: false,
      aggregate: {
        status: 'complete',
        availableProviders: ['hyperliquid', 'lighter'],
        unavailableProviders: [],
      },
    });

    const { result } = renderHook(() => usePerpsVenueBalances());

    await waitFor(() => {
      expect(result.current.venues).toHaveLength(2);
    });

    const hyper = result.current.venues.find(
      (v) => v.providerId === 'hyperliquid',
    );
    const lighter = result.current.venues.find(
      (v) => v.providerId === 'lighter',
    );
    expect(hyper).toMatchObject({ status: 'available' });
    expect(hyper?.state?.totalBalance).toBe('100');
    expect(lighter).toMatchObject({ status: 'available' });
    expect(lighter?.state?.totalBalance).toBe('50');
    // The combined total is the aggregated top level.
    expect(result.current.total?.totalBalance).toBe('150');
    expect(result.current.aggregate?.status).toBe('complete');
  });

  it('reports the single direct-mode state as the active venue', () => {
    mockUsePerpsLiveAccount.mockReturnValue({
      account: directAccount,
      isInitialLoading: false,
      aggregate: null,
    });

    const { result } = renderHook(() => usePerpsVenueBalances());

    expect(result.current.venues).toHaveLength(1);
    expect(result.current.venues[0]).toMatchObject({
      status: 'available',
    });
    expect(result.current.venues[0].state?.totalBalance).toBe('100');
    expect(result.current.total?.totalBalance).toBe('100');
    expect(result.current.aggregate).toBeNull();
  });

  it('never shows a pending venue as zero', () => {
    const account = {
      totalBalance: '100',
      unrealizedPnl: '5',
      providerStates: {
        hyperliquid: {
          status: 'available',
          providerId: 'hyperliquid',
          state: { totalBalance: '100', unrealizedPnl: '5' },
        },
        lighter: { status: 'pending', providerId: 'lighter' },
      },
    } as unknown as AccountState;

    mockUsePerpsLiveAccount.mockReturnValue({
      account,
      isInitialLoading: false,
      aggregate: partialAggregate,
    });

    const { result } = renderHook(() => usePerpsVenueBalances());

    const lighter = result.current.venues.find(
      (v) => v.providerId === 'lighter',
    );
    expect(lighter?.status).toBe('pending');
    expect(lighter?.state).toBeUndefined();
    expect(result.current.aggregate?.status).toBe('partial');
  });

  it('reports an unavailable venue when its persisted balance exists but the stream errors', () => {
    (
      Engine.context.PerpsController.state as Record<string, unknown>
    ).perpsBalances = {
      hyperliquid: { accountValue1dAgo: '90' },
      lighter: { accountValue1dAgo: '40' },
    };
    mockUsePerpsLiveAccount.mockReturnValue({
      account: null,
      isInitialLoading: false,
      aggregate: null,
    });
    mockUsePerpsConnection.mockReturnValue({
      error: new Error('stream failed'),
      isConnecting: false,
      isInitialized: true,
      isConnected: false,
      connectionGeneration: 0,
    } as never);

    const { result } = renderHook(() => usePerpsVenueBalances());

    // A venue that failed to load is unavailable, never a zero balance.
    expect(result.current.venues).toHaveLength(2);
    expect(result.current.venues.every((v) => v.status === 'unavailable')).toBe(
      true,
    );
    expect(result.current.total).toBeNull();
  });
});
