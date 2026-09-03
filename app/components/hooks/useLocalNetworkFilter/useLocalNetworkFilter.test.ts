import { act, renderHook } from '@testing-library/react-native';
import type { CaipChainId, Hex } from '@metamask/utils';
import {
  useLocalNetworkFilter,
  useEvmChainIdsForLocalFilter,
  useChainIdsForLocalFilter,
} from './useLocalNetworkFilter';
import { useNetworkEnablement } from '../useNetworkEnablement/useNetworkEnablement';

jest.mock('../useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(),
}));

const mockUseNetworkEnablement = useNetworkEnablement as jest.MockedFunction<
  typeof useNetworkEnablement
>;

describe('useLocalNetworkFilter', () => {
  it('defaults to null ("all popular networks")', () => {
    const { result } = renderHook(() => useLocalNetworkFilter());

    expect(result.current[0]).toBeNull();
  });

  it('updates the filter via the setter', () => {
    const { result } = renderHook(() => useLocalNetworkFilter());

    act(() => {
      result.current[1](['eip155:1'] as CaipChainId[]);
    });

    expect(result.current[0]).toEqual(['eip155:1']);
  });
});

describe('useEvmChainIdsForLocalFilter', () => {
  const popularEvmNetworks: Hex[] = ['0x1', '0x89'];

  beforeEach(() => {
    mockUseNetworkEnablement.mockReturnValue({
      popularEvmNetworks,
    } as unknown as ReturnType<typeof useNetworkEnablement>);
  });

  it('falls back to popularEvmNetworks when the filter is null', () => {
    const { result } = renderHook(() => useEvmChainIdsForLocalFilter(null));

    expect(result.current).toBe(popularEvmNetworks);
  });

  it('narrows a CAIP filter down to Hex EVM chain IDs', () => {
    const { result } = renderHook(() =>
      useEvmChainIdsForLocalFilter([
        'eip155:137',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      ] as CaipChainId[]),
    );

    expect(result.current).toEqual(['0x89']);
  });

  it('returns an empty array when the filter has no EVM networks', () => {
    const { result } = renderHook(() =>
      useEvmChainIdsForLocalFilter([
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      ] as CaipChainId[]),
    );

    expect(result.current).toEqual([]);
  });
});

describe('useChainIdsForLocalFilter', () => {
  const popularNetworks: CaipChainId[] = [
    'eip155:1',
    'eip155:137',
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  ];

  beforeEach(() => {
    mockUseNetworkEnablement.mockReturnValue({
      popularNetworks,
    } as unknown as ReturnType<typeof useNetworkEnablement>);
  });

  it('falls back to popularNetworks when the filter is null', () => {
    const { result } = renderHook(() => useChainIdsForLocalFilter(null));

    expect(result.current).toBe(popularNetworks);
  });

  it('returns the filter unchanged when set', () => {
    const filter: CaipChainId[] = ['eip155:137'];
    const { result } = renderHook(() => useChainIdsForLocalFilter(filter));

    expect(result.current).toBe(filter);
  });
});
