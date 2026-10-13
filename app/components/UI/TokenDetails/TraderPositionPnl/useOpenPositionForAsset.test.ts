import { renderHook } from '@testing-library/react-native';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import {
  getOpenPositionForAsset,
  TraderPositionHttpError,
} from './traderPositionService';
import { useOpenPositionForAsset } from './useOpenPositionForAsset';
import { TRADER_POSITION_POLL_INTERVAL_MS } from './useTraderPosition';

jest.mock('./traderPositionService', () => ({
  ...jest.requireActual('./traderPositionService'),
  getOpenPositionForAsset: jest.fn(),
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
const mockGetOpenPosition = getOpenPositionForAsset as jest.MockedFunction<
  typeof getOpenPositionForAsset
>;

interface QueryOptions {
  queryFn: (context: { signal?: AbortSignal }) => Promise<unknown>;
  enabled: boolean;
  refetchInterval: number | false;
}

const queryOptions = (): QueryOptions =>
  mockUseQuery.mock.calls[0][0] as QueryOptions;

describe('useOpenPositionForAsset', () => {
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

  it('polls while the screen is focused and a wallet and asset are present', () => {
    renderHook(() => useOpenPositionForAsset('0xAbc', 'eip155:1/slip44:60'));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        refetchInterval: TRADER_POSITION_POLL_INTERVAL_MS,
      }),
    );
  });

  it('stays disabled without an asset id', () => {
    renderHook(() => useOpenPositionForAsset('0xAbc', undefined));

    expect(queryOptions().enabled).toBe(false);
  });

  it('returns null when the route answers 404', async () => {
    mockGetOpenPosition.mockRejectedValue(new TraderPositionHttpError(404));
    renderHook(() => useOpenPositionForAsset('0xAbc', 'eip155:1/slip44:60'));

    await expect(queryOptions().queryFn({})).resolves.toBeNull();
  });

  it('returns null when the wallet is not owned', async () => {
    mockGetOpenPosition.mockRejectedValue(new TraderPositionHttpError(403));
    renderHook(() => useOpenPositionForAsset('0xAbc', 'eip155:1/slip44:60'));

    await expect(queryOptions().queryFn({})).resolves.toBeNull();
  });

  it('stops polling when the screen is not focused', () => {
    mockUseIsFocused.mockReturnValue(false);

    renderHook(() => useOpenPositionForAsset('0xAbc', 'eip155:1/slip44:60'));

    expect(queryOptions().refetchInterval).toBe(false);
  });
});
