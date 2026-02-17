import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { KnownCaipNamespace } from '@metamask/utils';
import { useCurrentNetworkInfo } from './useCurrentNetworkInfo';
import { useNetworkEnablement } from './useNetworkEnablement/useNetworkEnablement';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseNetworkEnablement = useNetworkEnablement as jest.MockedFunction<
  typeof useNetworkEnablement
>;

describe('useCurrentNetworkInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for networksByCaipChainId
    mockUseSelector.mockImplementation(() => {
      // First call: selectNetworkConfigurationsByCaipChainId
      if (mockUseSelector.mock.calls.length === 1) {
        return {
          'eip155:1': { name: 'Ethereum Mainnet', chainId: '0x1' },
          'eip155:137': { name: 'Polygon', chainId: '0x89' },
          'bip122:000000000019d6689c085ae165831e93': {
            name: 'Bitcoin',
            chainId: 'bip122:000000000019d6689c085ae165831e93',
          },
        };
      }
      // Second call: selectMultichainAccountsState2Enabled
      return false;
    });
  });

  describe('hasMultipleNamespacesEnabled', () => {
    it('should return false when only one namespace is enabled', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Eip155,
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x89': true,
          },
        },
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.hasMultipleNamespacesEnabled).toBe(false);
    });

    it('should return true when multiple namespaces are enabled', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Eip155,
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x89': true,
          },
          [KnownCaipNamespace.Bip122]: {
            'bip122:000000000019d6689c085ae165831e93': true,
          },
        },
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.hasMultipleNamespacesEnabled).toBe(true);
    });

    it('should return false when no namespaces are enabled', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Eip155,
        enabledNetworksByNamespace: {},
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.hasMultipleNamespacesEnabled).toBe(false);
    });

    it('should return false when all namespaces have no enabled networks', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Eip155,
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': false,
            '0x89': false,
          },
          [KnownCaipNamespace.Bip122]: {
            'bip122:000000000019d6689c085ae165831e93': false,
          },
        },
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.hasMultipleNamespacesEnabled).toBe(false);
    });

    it('should return true when exactly two namespaces have enabled networks', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Eip155,
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
          },
          [KnownCaipNamespace.Bip122]: {
            'bip122:000000000019d6689c085ae165831e93': false,
          },
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
          },
        },
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.hasMultipleNamespacesEnabled).toBe(true);
    });

    it('should handle non-object values in enabledNetworksByNamespace', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Eip155,
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
          },
          invalidNamespace: null,
        },
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.hasMultipleNamespacesEnabled).toBe(false);
    });
  });

  describe('isNetworkEnabledForDefi', () => {
    it('should return true when namespace is EVM (Eip155)', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Eip155,
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
          },
        },
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.isNetworkEnabledForDefi).toBe(true);
    });

    it('should return false when namespace is Bitcoin (Bip122)', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Bip122,
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Bip122]: {
            'bip122:000000000019d6689c085ae165831e93': true,
          },
        },
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.isNetworkEnabledForDefi).toBe(false);
    });

    it('should return false when namespace is Solana', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: 'solana',
        enabledNetworksByNamespace: {
          solana: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
          },
        },
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.isNetworkEnabledForDefi).toBe(false);
    });

    it('should return true when multiple namespaces are enabled (even if current is non-EVM)', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Bip122,
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
          },
          [KnownCaipNamespace.Bip122]: {
            'bip122:000000000019d6689c085ae165831e93': true,
          },
        },
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.isNetworkEnabledForDefi).toBe(true);
      expect(result.current.hasMultipleNamespacesEnabled).toBe(true);
    });

    it('should return true when namespace is EVM and multiple namespaces are enabled', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Eip155,
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
          },
          [KnownCaipNamespace.Bip122]: {
            'bip122:000000000019d6689c085ae165831e93': true,
          },
        },
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.isNetworkEnabledForDefi).toBe(true);
    });

    it('should return false when no networks are enabled', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Bip122,
        enabledNetworksByNamespace: {},
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.isNetworkEnabledForDefi).toBe(false);
    });
  });

  describe('integration tests', () => {
    it('should return correct values for "All Popular Networks" mode', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Eip155,
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x89': true,
          },
          [KnownCaipNamespace.Bip122]: {
            'bip122:000000000019d6689c085ae165831e93': true,
          },
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
          },
        },
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.hasMultipleNamespacesEnabled).toBe(true);
      expect(result.current.isNetworkEnabledForDefi).toBe(true);
    });

    it('should return correct values for single EVM network', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Eip155,
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
          },
        },
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.hasMultipleNamespacesEnabled).toBe(false);
      expect(result.current.isNetworkEnabledForDefi).toBe(true);
    });

    it('should return correct values for single non-EVM network', () => {
      mockUseNetworkEnablement.mockReturnValue({
        namespace: KnownCaipNamespace.Bip122,
        enabledNetworksByNamespace: {
          [KnownCaipNamespace.Bip122]: {
            'bip122:000000000019d6689c085ae165831e93': true,
          },
        },
      } as unknown as ReturnType<typeof useNetworkEnablement>);

      const { result } = renderHook(() => useCurrentNetworkInfo());

      expect(result.current.hasMultipleNamespacesEnabled).toBe(false);
      expect(result.current.isNetworkEnabledForDefi).toBe(false);
    });
  });
});
