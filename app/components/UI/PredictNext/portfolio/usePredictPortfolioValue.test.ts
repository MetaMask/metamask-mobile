import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { usePredictPortfolio } from '../../Predict/hooks/usePredictPortfolio';
import {
  PredictPositionStatus,
  type PredictPosition,
} from '../../Predict/types';
import { usePredictAvailability } from '../availability';
import { useActiveVenue } from '../implementation/activeVenue';
import { expectInactiveHookHasNoSideEffects } from '../implementation/inactiveHook.testUtils';
import type { ActiveVenueResolution } from '../implementation/types';
import { usePredictPortfolioValue } from './usePredictPortfolioValue';

const mockGetBalance = jest.fn();
const mockGetPositions = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getBalance: (...args: unknown[]) => mockGetBalance(...args),
      getPositions: (...args: unknown[]) => mockGetPositions(...args),
    },
  },
}));

jest.mock('../../Predict/utils/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
}));

const mockEnsurePolygonNetworkExists = jest.fn<Promise<void>, []>();
jest.mock('../../Predict/hooks/usePredictNetworkManagement', () => ({
  usePredictNetworkManagement: () => ({
    ensurePolygonNetworkExists: mockEnsurePolygonNetworkExists,
  }),
}));

// Live prices, trading actions and account state are not part of the
// portfolio value; the Homepage Predictions section owns live prices.
jest.mock('../../Predict/hooks/usePredictLivePositions', () => ({
  usePredictLivePositions: jest.fn(),
}));
jest.mock('../../Predict/hooks/usePredictClaim', () => ({
  usePredictClaim: () => ({ claim: jest.fn(), isClaimPending: false }),
}));
jest.mock('../../Predict/hooks/usePredictDeposit', () => ({
  usePredictDeposit: () => ({ deposit: jest.fn(), isDepositPending: false }),
}));
jest.mock('../../Predict/hooks/usePredictWithdraw', () => ({
  usePredictWithdraw: () => ({
    withdraw: jest.fn(),
    withdrawTransaction: undefined,
  }),
}));
jest.mock('../../Predict/hooks/usePredictAccountState', () => ({
  usePredictAccountState: () => ({
    data: undefined,
    error: null,
    isRefetching: false,
    refetch: jest.fn(),
  }),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupId: jest.fn(() => 'mock-account-group-id'),
  }),
);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../availability', () => ({ usePredictAvailability: jest.fn() }));

jest.mock('../implementation/activeVenue', () => ({
  useActiveVenue: jest.fn(),
}));

const POLYMARKET: ActiveVenueResolution = {
  status: 'ready',
  venue: 'polymarket',
  source: 'legacyLane',
};
const KALSHI: ActiveVenueResolution = {
  status: 'ready',
  venue: 'kalshi',
  source: 'rollout',
};

const position = (
  id: string,
  currentValue: number,
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  amount: 10,
  avgPrice: 0.5,
  cashPnl: 0,
  claimable: false,
  currentValue,
  endDate: '2026-12-01T00:00:00Z',
  icon: 'icon',
  id,
  initialValue: currentValue,
  marketId: `market-${id}`,
  outcome: 'Yes',
  outcomeId: `outcome-${id}`,
  outcomeIndex: 0,
  outcomeTokenId: `token-${id}`,
  percentPnl: 0,
  price: 0.5,
  providerId: 'polymarket',
  size: 10,
  status: PredictPositionStatus.OPEN,
  title: `Market ${id}`,
  ...overrides,
});

/** 12.5 cash + 25.25 open + 4 won; the lost claimable position counts for nothing. */
const POSITIONS = [
  position('open', 25.25),
  position('won', 4, { claimable: true, status: PredictPositionStatus.WON }),
  position('lost', 9, { claimable: true, status: PredictPositionStatus.LOST }),
];

const givenPredict = ({
  available = true,
  venue = POLYMARKET,
}: { available?: boolean; venue?: ActiveVenueResolution } = {}) => {
  jest.mocked(usePredictAvailability).mockReturnValue(available);
  jest.mocked(useActiveVenue).mockReturnValue(venue);
};

const mockMessengerCall = jest.fn();

const KALSHI_SUMMARY = {
  venueId: 'kalshi',
  currency: 'USD',
  availableBalance: '123.13',
  positionsValue: '45.00',
  claimableValue: '0',
  totalValue: '168.13',
  unrealizedPnl: '3.75',
  asOf: '2026-10-23T12:00:05.120Z',
  complete: true,
};

/** Legacy reads bring their own query functions; canonical reads use the
 * default one, which calls the messenger as the app's UI query client does. */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        queryFn: ({ queryKey }) =>
          mockMessengerCall(...(queryKey as [string, ...unknown[]])),
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const expectNothingRead = () => {
  expect(mockMessengerCall).not.toHaveBeenCalled();
  expect(mockGetBalance).not.toHaveBeenCalled();
  expect(mockGetPositions).not.toHaveBeenCalled();
  expect(mockEnsurePolygonNetworkExists).not.toHaveBeenCalled();
};

describe('usePredictPortfolioValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBalance.mockResolvedValue(12.5);
    mockGetPositions.mockResolvedValue(POSITIONS);
    mockEnsurePolygonNetworkExists.mockResolvedValue(undefined);
  });

  describe('while the legacy implementation is active', () => {
    it("returns usePredictPortfolio's portfolio value unchanged", async () => {
      givenPredict();

      const { result } = renderHook(
        () => ({
          value: usePredictPortfolioValue(),
          legacy: usePredictPortfolio({ livePriceUpdates: false }),
        }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.value.status).toBe('ready'));
      expect(result.current.value).toEqual({
        status: 'ready',
        valueUsd: 41.75,
      });
      expect(result.current.value.valueUsd).toBe(
        result.current.legacy.portfolioValue,
      );
      expect(mockMessengerCall).not.toHaveBeenCalled();
    });

    it('is ready at zero for an empty legacy portfolio', async () => {
      givenPredict();
      mockGetBalance.mockResolvedValue(0);
      mockGetPositions.mockResolvedValue([]);

      const { result } = renderHook(() => usePredictPortfolioValue(), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(result.current).toEqual({ status: 'ready', valueUsd: 0 }),
      );
    });

    it('is loading, without a value, while the legacy reads are in flight', () => {
      givenPredict();
      mockGetBalance.mockReturnValue(new Promise(() => undefined));

      const { result } = renderHook(() => usePredictPortfolioValue(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toEqual({ status: 'loading' });
    });

    it('is an error, without a value, when a legacy read fails', async () => {
      givenPredict();
      mockGetBalance.mockRejectedValue(new Error('balance request timed out'));

      const { result } = renderHook(() => usePredictPortfolioValue(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current).toEqual({ status: 'error' }));
    });
  });

  describe('while the next implementation is active', () => {
    it("is the Venue's Portfolio Summary total, never the legacy value", async () => {
      givenPredict({ venue: KALSHI });
      mockMessengerCall.mockResolvedValue(KALSHI_SUMMARY);

      const { result } = renderHook(() => usePredictPortfolioValue(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toEqual({ status: 'loading' });
      await waitFor(() =>
        expect(result.current).toEqual({ status: 'ready', valueUsd: 168.13 }),
      );
      expect(mockMessengerCall.mock.calls).toEqual([
        ['PredictPortfolioService:getPortfolioSummary', 'kalshi'],
      ]);
    });

    it('switches branch in the render that changes the Venue', async () => {
      givenPredict();
      mockMessengerCall.mockReturnValue(new Promise(() => undefined));
      const { result, rerender } = renderHook(
        () => usePredictPortfolioValue(),
        { wrapper: createWrapper() },
      );
      await waitFor(() =>
        expect(result.current).toEqual({ status: 'ready', valueUsd: 41.75 }),
      );

      givenPredict({ venue: KALSHI });
      rerender(undefined);

      expect(result.current).toEqual({ status: 'loading' });
    });

    it('never ensures Polygon or reads the legacy portfolio', async () => {
      givenPredict({ venue: KALSHI });

      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: usePredictPortfolioValue,
        sideEffects: [
          mockEnsurePolygonNetworkExists,
          mockGetBalance,
          mockGetPositions,
        ],
        wrapper: createWrapper(),
      });
    });
  });

  it('is unavailable, and reads nothing, while Predict is unavailable', async () => {
    givenPredict({ available: false });

    await expectInactiveHookHasNoSideEffects({
      useInactiveHook: usePredictPortfolioValue,
      sideEffects: [
        mockMessengerCall,
        mockEnsurePolygonNetworkExists,
        mockGetBalance,
        mockGetPositions,
      ],
      wrapper: createWrapper(),
    });
    const { result } = renderHook(() => usePredictPortfolioValue(), {
      wrapper: createWrapper(),
    });
    expect(result.current).toEqual({ status: 'unavailable' });
  });

  it('is loading, and reads nothing, while the Active Venue resolves', () => {
    givenPredict({ venue: { status: 'resolving' } });

    const { result } = renderHook(() => usePredictPortfolioValue(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual({ status: 'loading' });
    expectNothingRead();
  });
});
