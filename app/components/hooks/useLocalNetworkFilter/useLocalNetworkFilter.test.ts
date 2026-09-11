import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import {
  useLocalNetworkFilter,
  useEvmChainIdsForLocalFilter,
  useChainIdsForLocalFilter,
} from './useLocalNetworkFilter';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

beforeEach(() => {
  jest.clearAllMocks();
});

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
  const fakeState = {
    engine: {
      backgroundState: {
        NetworkEnablementController: {
          enabledNetworkMap: {
            eip155: { '0x1': true, '0x89': true },
          },
        },
      },
    },
  };

  beforeEach(() => {
    mockUseSelector.mockImplementation((selector) =>
      (selector as (state: typeof fakeState) => unknown)(fakeState),
    );
  });

  it('falls back to all enabled EVM networks when the filter is null', () => {
    const { result } = renderHook(() => useEvmChainIdsForLocalFilter(null));

    expect(result.current).toEqual(['0x1', '0x89']);
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
  const fakeState = {
    engine: {
      backgroundState: {
        NetworkEnablementController: {
          enabledNetworkMap: {
            eip155: { '0x1': true, '0x89': true },
            solana: {
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    mockUseSelector.mockImplementation((selector) =>
      (selector as (state: typeof fakeState) => unknown)(fakeState),
    );
  });

  it('falls back to all enabled networks when the filter is null', () => {
    const { result } = renderHook(() => useChainIdsForLocalFilter(null));

    expect(result.current).toEqual([
      'eip155:1',
      'eip155:137',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    ]);
  });

  it('returns the filter unchanged when set', () => {
    const filter: CaipChainId[] = ['eip155:137'];
    const { result } = renderHook(() => useChainIdsForLocalFilter(filter));

    expect(result.current).toBe(filter);
  });
});
