import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import { addBreadcrumb } from '@sentry/react-native';
import type { Position } from '@metamask/social-controllers';
import Logger from '../../../../../util/Logger';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import { useTraderPosition } from './useTraderPosition';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../selectors/keyringController', () => ({
  selectIsUnlocked: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('@metamask/react-data-query');

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

const mockAddBreadcrumb = addBreadcrumb as jest.Mock;

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const makeQueryResult = (
  overrides: Partial<ReturnType<typeof useQuery>> = {},
): ReturnType<typeof useQuery> =>
  ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  }) as ReturnType<typeof useQuery>;

const mockPosition: Position = {
  positionId: 'position-uuid-1',
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x1234567890123456789012345678901234567890',
  chain: 'base',
  positionAmount: 1000,
  boughtUsd: 500,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 500,
  trades: [],
  lastTradeAt: Date.now(),
};

describe('useTraderPosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) return true;
      return undefined;
    });
  });

  it('calls useQuery with the SocialService:fetchPositionById key', () => {
    mockUseQuery.mockReturnValue(makeQueryResult());

    renderHook(() => useTraderPosition('position-uuid-1'));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          'SocialService:fetchPositionById',
          { positionId: 'position-uuid-1' },
        ],
        enabled: true,
      }),
    );
  });

  it('disables the query when positionId is undefined', () => {
    mockUseQuery.mockReturnValue(makeQueryResult());

    renderHook(() => useTraderPosition(undefined));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('disables the query when wallet is locked', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) return false;
      return undefined;
    });
    mockUseQuery.mockReturnValue(makeQueryResult());

    renderHook(() => useTraderPosition('position-uuid-1'));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('returns the resolved position on success', () => {
    mockUseQuery.mockReturnValue(
      makeQueryResult({ data: mockPosition, isLoading: false }),
    );

    const { result } = renderHook(() => useTraderPosition('position-uuid-1'));

    expect(result.current.position).toEqual(mockPosition);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('reflects the loading state from useQuery', () => {
    mockUseQuery.mockReturnValue(makeQueryResult({ isLoading: true }));

    const { result } = renderHook(() => useTraderPosition('position-uuid-1'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.position).toBeUndefined();
  });

  it('returns the error message and logs on failure with enriched extras', () => {
    const fetchError = new Error('boom');
    mockUseQuery.mockReturnValue(makeQueryResult({ error: fetchError }));

    const { result } = renderHook(() => useTraderPosition('position-uuid-1'));

    expect(result.current.error).toBe('boom');
    expect(Logger.error).toHaveBeenCalledWith(
      fetchError,
      expect.objectContaining({
        message: 'useTraderPosition: fetch failed',
        endpoint: 'position_by_id',
        errorCategory: expect.any(String),
      }),
    );
  });

  it('emits a failure breadcrumb when an error is set', () => {
    const fetchError = new Error('boom');
    mockUseQuery.mockReturnValue(makeQueryResult({ error: fetchError }));

    renderHook(() => useTraderPosition('position-uuid-1'));

    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'social_service',
        level: 'error',
        message: expect.stringContaining(
          'social_service.position_by_id.failure',
        ),
      }),
    );
  });

  it('includes httpStatus in the failure breadcrumb for HttpError', () => {
    const fetchError = Object.assign(new Error('Unauthorized'), {
      httpStatus: 401,
    });
    mockUseQuery.mockReturnValue(makeQueryResult({ error: fetchError }));

    renderHook(() => useTraderPosition('position-uuid-1'));

    expect(mockAddBreadcrumb.mock.calls[0][0].message).toContain('status=401');
  });

  it('does not emit a breadcrumb when there is no error', () => {
    mockUseQuery.mockReturnValue(makeQueryResult({ data: mockPosition }));

    renderHook(() => useTraderPosition('position-uuid-1'));

    expect(mockAddBreadcrumb).not.toHaveBeenCalled();
  });
});
