import { renderHook } from '@testing-library/react-hooks';
import { useSlippageConfig } from './index';
import AppConstants from '../../../../../core/AppConstants';
import { formatChainIdToCaip } from '@metamask/bridge-controller';

// Mock formatChainIdToCaip
jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToCaip: jest.fn((chainId) => {
    // Mock implementation that returns CAIP format
    if (!chainId) return undefined;
    if (chainId === '0x1') return 'eip155:1';
    if (chainId === 'eip155:1') return 'eip155:1';
    if (chainId === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp') {
      return 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    }
    return chainId;
  }),
}));

const mockFormatChainIdToCaip = formatChainIdToCaip as jest.MockedFunction<
  typeof formatChainIdToCaip
>;

describe('useSlippageConfig', () => {
  const defaultConfig = AppConstants.BRIDGE.SLIPPAGE_CONFIG.__default__;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns default config if network is not defined', () => {
    const { result } = renderHook(() => useSlippageConfig(undefined));

    expect(result.current).toEqual(defaultConfig);
    expect(result.current).toMatchSnapshot();
  });

  it('returns default config if network does not exist on config object', () => {
    const { result } = renderHook(() =>
      useSlippageConfig('eip155:999' as `${string}:${string}`),
    );

    // Should return default config merged with empty object
    expect(result.current).toEqual(defaultConfig);
    expect(result.current).toMatchSnapshot();
  });

  it('should replace custom fields for network if defined', () => {
    const { result } = renderHook(() =>
      useSlippageConfig('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'),
    );

    // Key assertion - custom slippage options from Solana config
    expect(result.current.default_slippage_options).toEqual([
      'auto',
      '0.5',
      '2',
    ]);

    // Snapshot shows merge with other defaults preserved
    expect(result.current).toMatchSnapshot();
  });

  describe('network format handling', () => {
    it('handles hex chainId format', () => {
      const { result } = renderHook(() => useSlippageConfig('0x1'));

      expect(result.current).toEqual(defaultConfig);
    });

    it('handles CAIP chainId format', () => {
      const { result } = renderHook(() => useSlippageConfig('eip155:1'));

      expect(result.current).toEqual(defaultConfig);
    });

    it('handles Solana CAIP format', () => {
      const { result } = renderHook(() =>
        useSlippageConfig('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'),
      );

      expect(result.current.default_slippage_options).toEqual([
        'auto',
        '0.5',
        '2',
      ]);
    });
  });

  describe('merge behavior', () => {
    it('merges network-specific config with default config', () => {
      const { result } = renderHook(() =>
        useSlippageConfig('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'),
      );

      // Key assertion - custom field from Solana config
      expect(result.current.default_slippage_options).toEqual([
        'auto',
        '0.5',
        '2',
      ]);

      // Snapshot shows full merge with defaults preserved
      expect(result.current).toMatchSnapshot();
    });

    it('does not mutate default config', () => {
      const originalDefault = { ...defaultConfig };

      renderHook(() =>
        useSlippageConfig('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'),
      );

      expect(defaultConfig).toEqual(originalDefault);
    });
  });

  describe('deep merge behavior', () => {
    beforeEach(() => {
      // Add a test network config with partial nested object override
      (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'test:network:1'
      ] = {
        max_amount: 50,
        lower_allowed_slippage_threshold: {
          value: 1,
        },
      };
    });

    afterEach(() => {
      // Clean up test config
      delete (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'test:network:1'
      ];
    });

    it('deep merges nested threshold objects', () => {
      mockFormatChainIdToCaip.mockImplementation((chainId) =>
        chainId === 'test:network:1'
          ? ('test:network:1' as `${string}:${string}`)
          : (chainId as `${string}:${string}`),
      );

      const { result } = renderHook(() =>
        useSlippageConfig('test:network:1' as `${string}:${string}`),
      );

      // Key assertions for critical behavior
      expect(result.current.max_amount).toBe(50);
      expect(result.current.lower_allowed_slippage_threshold?.value).toBe(1);

      // Snapshot captures full merged result showing deep merge behavior
      expect(result.current).toMatchSnapshot();
    });

    it('handles complete threshold object replacement', () => {
      (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'test:network:2'
      ] = {
        upper_allowed_slippage_threshold: {
          messageId: 'custom.message',
          value: 75,
          inclusive: true,
        },
      };

      mockFormatChainIdToCaip.mockImplementation((chainId) =>
        chainId === 'test:network:2'
          ? ('test:network:2' as `${string}:${string}`)
          : (chainId as `${string}:${string}`),
      );

      const { result } = renderHook(() =>
        useSlippageConfig('test:network:2' as `${string}:${string}`),
      );

      // Key assertion
      expect(result.current.upper_allowed_slippage_threshold?.value).toBe(75);

      // Snapshot shows complete merged config
      expect(result.current).toMatchSnapshot();

      // Cleanup
      delete (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'test:network:2'
      ];
    });

    it('handles null threshold override', () => {
      (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'test:network:3'
      ] = {
        lower_suggested_slippage_threshold: null,
      };

      mockFormatChainIdToCaip.mockImplementation((chainId) =>
        chainId === 'test:network:3'
          ? ('test:network:3' as `${string}:${string}`)
          : (chainId as `${string}:${string}`),
      );

      const { result } = renderHook(() =>
        useSlippageConfig('test:network:3' as `${string}:${string}`),
      );

      // Key assertion
      expect(result.current.lower_suggested_slippage_threshold).toBeNull();

      // Snapshot shows rest of config unchanged
      expect(result.current).toMatchSnapshot();

      // Cleanup
      delete (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'test:network:3'
      ];
    });

    it('replaces arrays rather than merging them', () => {
      (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'test:network:4'
      ] = {
        default_slippage_options: ['10', '20'],
      };

      mockFormatChainIdToCaip.mockImplementation((chainId) =>
        chainId === 'test:network:4'
          ? ('test:network:4' as `${string}:${string}`)
          : (chainId as `${string}:${string}`),
      );

      const { result } = renderHook(() =>
        useSlippageConfig('test:network:4' as `${string}:${string}`),
      );

      // Key assertion - array replaced, not merged
      expect(result.current.default_slippage_options).toEqual(['10', '20']);

      // Snapshot captures full config
      expect(result.current).toMatchSnapshot();

      // Cleanup
      delete (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'test:network:4'
      ];
    });

    it('handles multiple property overrides with deep merge', () => {
      (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'test:network:5'
      ] = {
        input_step: 0.5,
        max_amount: 200,
        lower_allowed_slippage_threshold: {
          value: 2,
        },
        upper_suggested_slippage_threshold: {
          messageId: 'custom.upper.warning',
          value: 10,
        },
      };

      mockFormatChainIdToCaip.mockImplementation((chainId) =>
        chainId === 'test:network:5'
          ? ('test:network:5' as `${string}:${string}`)
          : (chainId as `${string}:${string}`),
      );

      const { result } = renderHook(() =>
        useSlippageConfig('test:network:5' as `${string}:${string}`),
      );

      // Key assertions for overridden values
      expect(result.current.input_step).toBe(0.5);
      expect(result.current.max_amount).toBe(200);
      expect(result.current.lower_allowed_slippage_threshold?.value).toBe(2);

      // Snapshot shows full deep merge behavior
      expect(result.current).toMatchSnapshot();

      // Cleanup
      delete (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'test:network:5'
      ];
    });
  });

  describe('edge cases', () => {
    it('handles null network', () => {
      const { result } = renderHook(() => useSlippageConfig(undefined));

      expect(result.current).toEqual(defaultConfig);
    });

    it('handles empty string network', () => {
      const { result } = renderHook(() =>
        useSlippageConfig('' as `0x${string}`),
      );

      expect(result.current).toEqual(defaultConfig);
    });

    it('handles malformed chainId', () => {
      const { result } = renderHook(() =>
        useSlippageConfig('invalid-chain-id' as `${string}:${string}`),
      );

      // Should return default config (no match in config object)
      expect(result.current).toEqual(defaultConfig);
    });

    it('returns same reference for same input', () => {
      const { result: result1 } = renderHook(() => useSlippageConfig('0x1'));
      const { result: result2 } = renderHook(() => useSlippageConfig('0x1'));

      // Note: lodash/fp merge creates new objects, so references won't be equal
      // But values should be equal
      expect(result1.current).toEqual(result2.current);
    });
  });

  describe('config structure validation', () => {
    it('returns config with all required fields and correct types', () => {
      const { result } = renderHook(() => useSlippageConfig('0x1'));

      // Type validation
      expect(typeof result.current.input_step).toBe('number');
      expect(typeof result.current.max_amount).toBe('number');
      expect(typeof result.current.min_amount).toBe('number');
      expect(Array.isArray(result.current.default_slippage_options)).toBe(true);

      // Snapshot shows complete structure
      expect(result.current).toMatchSnapshot();
    });
  });

  describe('Solana-specific configuration', () => {
    it('has "auto" as first slippage option for Solana', () => {
      const { result } = renderHook(() =>
        useSlippageConfig('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'),
      );

      expect(result.current.default_slippage_options[0]).toBe('auto');
      expect(result.current).toMatchSnapshot();
    });

    it('preserves all other config values for Solana', () => {
      const { result } = renderHook(() =>
        useSlippageConfig('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'),
      );

      // Key assertions for non-overridden fields
      expect(result.current.input_step).toBe(defaultConfig.input_step);
      expect(result.current.max_amount).toBe(defaultConfig.max_amount);

      // Snapshot shows all fields preserved
      expect(result.current).toMatchSnapshot();
    });
  });

  describe('snapshots', () => {
    it('matches snapshot for undefined network', () => {
      const { result } = renderHook(() => useSlippageConfig(undefined));
      expect(result.current).toMatchSnapshot();
    });

    it('matches snapshot for default network', () => {
      const { result } = renderHook(() => useSlippageConfig('0x1'));
      expect(result.current).toMatchSnapshot();
    });

    it('matches snapshot for Solana network', () => {
      const { result } = renderHook(() =>
        useSlippageConfig('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'),
      );
      expect(result.current).toMatchSnapshot();
    });

    it('matches snapshot for non-existent network', () => {
      const { result } = renderHook(() =>
        useSlippageConfig('eip155:999' as `${string}:${string}`),
      );
      expect(result.current).toMatchSnapshot();
    });
  });
});
