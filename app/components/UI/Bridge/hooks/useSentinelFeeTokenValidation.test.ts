import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type { SentinelFeeTokensByChain } from '../api/sentinelFeeTokens';
import { useSentinelFeeTokenValidation } from './useSentinelFeeTokenValidation';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/react-data-query', () => ({
  useQuery: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);
const mockRefetch = jest.fn().mockResolvedValue(undefined);
const SOURCE_ASSET_ID =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const DESTINATION_ASSET_ID =
  'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f';
const SENTINEL_TOKENS: SentinelFeeTokensByChain = {
  'eip155:1': [{ assetId: SOURCE_ASSET_ID, symbol: 'DUM8' }],
};
const COMPLETE_INPUTS = {
  chainId: 'eip155:1',
  sourceAssetId: SOURCE_ASSET_ID,
  destinationAssetId: DESTINATION_ASSET_ID,
} as const;

function setQueryResult({
  data,
  isError = false,
}: {
  data?: SentinelFeeTokensByChain;
  isError?: boolean;
}) {
  mockUseQuery.mockReturnValue({
    data,
    isError,
    refetch: mockRefetch,
  } as unknown as ReturnType<typeof useQuery>);
}

describe('useSentinelFeeTokenValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(900_000);
    setQueryResult({});
  });

  it('returns incomplete-inputs before the pair is selected', () => {
    const { result } = renderHook(() =>
      useSentinelFeeTokenValidation({
        chainId: 'eip155:1',
        sourceAssetId: SOURCE_ASSET_ID,
      }),
    );

    expect(result.current).toMatchObject({
      isValid: false,
      reason: 'incomplete-inputs',
    });
  });

  it('returns loading before the first response settles', () => {
    setQueryResult({});

    const { result } = renderHook(() =>
      useSentinelFeeTokenValidation(COMPLETE_INPUTS),
    );

    expect(result.current).toMatchObject({
      isValid: false,
      reason: 'loading',
    });
  });

  it('returns unavailable when the cold fetch fails', () => {
    setQueryResult({ isError: true });

    const { result } = renderHook(() =>
      useSentinelFeeTokenValidation(COMPLETE_INPUTS),
    );

    expect(result.current).toMatchObject({
      isValid: false,
      reason: 'unavailable',
    });
  });

  it('accepts a pair containing a source asset listed by Sentinel', () => {
    setQueryResult({ data: SENTINEL_TOKENS });

    const { result } = renderHook(() =>
      useSentinelFeeTokenValidation(COMPLETE_INPUTS),
    );

    expect(result.current.isValid).toBe(true);
  });

  it('returns unsupported-pair when Sentinel lists neither asset', () => {
    setQueryResult({ data: {} });

    const { result } = renderHook(() =>
      useSentinelFeeTokenValidation(COMPLETE_INPUTS),
    );

    expect(result.current).toMatchObject({
      isValid: false,
      reason: 'unsupported-pair',
    });
  });

  it('continues validating stale data after a refresh failure', () => {
    setQueryResult({ data: SENTINEL_TOKENS, isError: true });

    const { result } = renderHook(() =>
      useSentinelFeeTokenValidation(COMPLETE_INPUTS),
    );

    expect(result.current.isValid).toBe(true);
  });

  it('retries a cold fetch failure', () => {
    setQueryResult({ isError: true });
    const { result } = renderHook(() =>
      useSentinelFeeTokenValidation(COMPLETE_INPUTS),
    );
    mockRefetch.mockClear();

    act(() => result.current.retry());

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
