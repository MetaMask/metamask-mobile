import { renderHook } from '@testing-library/react-native';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import type { TraderPosition } from './types';
import {
  getTraderPosition,
  TraderPositionHttpError,
} from './traderPositionService';
import {
  TRADER_POSITION_POLL_INTERVAL_MS,
  useTraderPosition,
} from './useTraderPosition';

jest.mock('./traderPositionService', () => ({
  ...jest.requireActual('./traderPositionService'),
  getTraderPosition: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../../../util/social/socialServiceTelemetry', () => ({
  formatSocialQueryErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : null,
  useLogSocialQueryError: jest.fn(),
}));

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseIsFocused = useIsFocused as jest.MockedFunction<
  typeof useIsFocused
>;
const mockGetTraderPosition = getTraderPosition as jest.MockedFunction<
  typeof getTraderPosition
>;

interface QueryOptions {
  queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>;
  queryKey: readonly unknown[];
  enabled: boolean;
}

const queryOptions = (): QueryOptions =>
  mockUseQuery.mock.calls[0][0] as QueryOptions;

describe('useTraderPosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsFocused.mockReturnValue(true);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) return true;
      return undefined;
    });
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useQuery>);
  });

  it('polls while the screen is focused', () => {
    renderHook(() => useTraderPosition('pos-1'));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        refetchInterval: TRADER_POSITION_POLL_INTERVAL_MS,
      }),
    );
  });

  it('stops polling when the screen is not focused', () => {
    mockUseIsFocused.mockReturnValue(false);

    renderHook(() => useTraderPosition('pos-1'));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ refetchInterval: false }),
    );
  });

  it('stays idle when there is no position id', () => {
    const { result } = renderHook(() => useTraderPosition(undefined));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(result.current.position).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('stays idle while the wallet is locked', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) return false;
      return undefined;
    });
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => useTraderPosition('pos-1'));

    expect(queryOptions().enabled).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns the loaded position', () => {
    const loaded = { positionId: 'pos-1' };
    mockUseQuery.mockReturnValue({
      data: loaded,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => useTraderPosition('pos-1'));

    expect(result.current.position).toEqual(loaded);
    expect(queryOptions().queryKey).toEqual([
      'TraderPositionPnl',
      'position',
      'pos-1',
    ]);
  });

  it('returns the query error message', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('network down'),
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => useTraderPosition('pos-1'));

    expect(result.current.error).toBe('network down');
  });

  it('refetches the position query', async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch,
    } as unknown as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => useTraderPosition('pos-1'));

    await result.current.refetch();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('requests an empty id when the query runs without a position id', async () => {
    mockGetTraderPosition.mockResolvedValue({
      positionId: '',
    } as TraderPosition);

    renderHook(() => useTraderPosition(undefined));

    await queryOptions().queryFn({});

    expect(mockGetTraderPosition).toHaveBeenCalledWith('', undefined);
  });

  it('returns the fetched position from the query', async () => {
    const signal = new AbortController().signal;
    const loaded = { positionId: 'pos-1' } as TraderPosition;
    mockGetTraderPosition.mockResolvedValue(loaded);

    renderHook(() => useTraderPosition('pos-1'));

    await expect(queryOptions().queryFn({ signal })).resolves.toBe(loaded);
    expect(mockGetTraderPosition).toHaveBeenCalledWith('pos-1', signal);
  });

  it('treats a 404 as no position', async () => {
    mockGetTraderPosition.mockRejectedValue(new TraderPositionHttpError(404));

    renderHook(() => useTraderPosition('pos-1'));

    await expect(queryOptions().queryFn({})).resolves.toBeNull();
  });

  it('rethrows a non-404 position error', async () => {
    const error = new TraderPositionHttpError(401);
    mockGetTraderPosition.mockRejectedValue(error);

    renderHook(() => useTraderPosition('pos-1'));

    await expect(queryOptions().queryFn({})).rejects.toBe(error);
  });
});
