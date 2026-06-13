import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNetworkEnabledPredicate } from './useNetworkEnabledPredicate';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const SOLANA_SCOPE = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

const mockEnabledNetworks = (evm: string[], nonEvm: string[]) => {
  mockUseSelector.mockReturnValueOnce(evm).mockReturnValueOnce(nonEvm);
};

describe('useNetworkEnabledPredicate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true for an enabled EVM chain id', () => {
    mockEnabledNetworks(['0x1', '0x2105'], []);

    const { result } = renderHook(() => useNetworkEnabledPredicate());

    expect(result.current('0x1')).toBe(true);
  });

  it('returns false for a disabled EVM chain id', () => {
    mockEnabledNetworks(['0x1'], []);

    const { result } = renderHook(() => useNetworkEnabledPredicate());

    expect(result.current('0x3e7')).toBe(false);
  });

  it('matches EVM chain ids case-insensitively', () => {
    mockEnabledNetworks(['0xA'], []);

    const { result } = renderHook(() => useNetworkEnabledPredicate());

    expect(result.current('0xa')).toBe(true);
  });

  it('returns true for an enabled non-EVM (Solana) chain id', () => {
    mockEnabledNetworks([], [SOLANA_SCOPE]);

    const { result } = renderHook(() => useNetworkEnabledPredicate());

    expect(result.current(SOLANA_SCOPE)).toBe(true);
  });

  it('returns false for a disabled non-EVM (Solana) chain id', () => {
    mockEnabledNetworks([], []);

    const { result } = renderHook(() => useNetworkEnabledPredicate());

    expect(result.current(SOLANA_SCOPE)).toBe(false);
  });

  it('returns false when the chain id is undefined', () => {
    mockEnabledNetworks(['0x1'], [SOLANA_SCOPE]);

    const { result } = renderHook(() => useNetworkEnabledPredicate());

    expect(result.current(undefined)).toBe(false);
  });
});
