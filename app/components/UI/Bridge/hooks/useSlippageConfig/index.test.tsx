import { renderHook } from '@testing-library/react-hooks';
import { useSlippageConfig } from './index';
import AppConstants from '../../../../../core/AppConstants';

describe('useSlippageConfig', () => {
  const defaultConfig = AppConstants.BRIDGE.SLIPPAGE_CONFIG.__default__;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('returns default config', () => {
    it('when no params provided', () => {
      const { result } = renderHook(() => useSlippageConfig({}));

      expect(result.current).toEqual(defaultConfig);
    });

    it('when sourceChainId is undefined', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({ sourceChainId: undefined }),
      );

      expect(result.current).toEqual(defaultConfig);
    });

    it('when sourceChainId has no matching config', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({ sourceChainId: 'eip155:1' }),
      );

      expect(result.current).toEqual(defaultConfig);
    });

    it('when sourceChainId and destChainId have no matching config', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: 'eip155:1',
          destChainId: 'eip155:137',
        }),
      );

      expect(result.current).toEqual(defaultConfig);
    });
  });

  describe('chain ID format handling', () => {
    it('handles hex chainId format for sourceChainId', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({ sourceChainId: '0x1' }),
      );

      expect(result.current).toEqual(defaultConfig);
    });

    it('handles hex chainId format for destChainId', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: '0x1',
          destChainId: '0x89',
        }),
      );

      expect(result.current).toEqual(defaultConfig);
    });

    it('handles CAIP chainId format', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({ sourceChainId: 'eip155:1' }),
      );

      expect(result.current).toEqual(defaultConfig);
    });

    it('handles Solana CAIP format', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          destChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        }),
      );

      // Solana->Solana has specific config
      expect(result.current.default_slippage_options).toEqual([
        'auto',
        '0.5',
        '2',
      ]);
    });
  });

  describe('config priority and merging', () => {
    beforeEach(() => {
      // Set up test configs with wildcard and destination-specific overrides
      (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'eip155:100'
      ] = {
        '*': {
          max_amount: 75,
          input_step: 0.5,
        },
        'eip155:200': {
          max_amount: 50,
          default_slippage_options: ['1', '2', '3'],
        },
      };
    });

    afterEach(() => {
      delete (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'eip155:100'
      ];
    });

    it('applies wildcard config when only sourceChainId matches', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({ sourceChainId: 'eip155:100' }),
      );

      // Wildcard config values
      expect(result.current.max_amount).toBe(75);
      expect(result.current.input_step).toBe(0.5);
      // Default values preserved
      expect(result.current.min_amount).toBe(defaultConfig.min_amount);
    });

    it('applies wildcard config when destChainId has no specific config', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: 'eip155:100',
          destChainId: 'eip155:999', // No specific config for this dest
        }),
      );

      // Wildcard config values
      expect(result.current.max_amount).toBe(75);
      expect(result.current.input_step).toBe(0.5);
    });

    it('applies destination-specific config over wildcard', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: 'eip155:100',
          destChainId: 'eip155:200',
        }),
      );

      // Destination-specific overrides wildcard
      expect(result.current.max_amount).toBe(50);
      expect(result.current.default_slippage_options).toEqual(['1', '2', '3']);
      // Wildcard values preserved where not overridden
      expect(result.current.input_step).toBe(0.5);
    });

    it('preserves default values not overridden by any config', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: 'eip155:100',
          destChainId: 'eip155:200',
        }),
      );

      // These should come from default config
      expect(result.current.min_amount).toBe(defaultConfig.min_amount);
      expect(result.current.input_max_decimals).toBe(
        defaultConfig.input_max_decimals,
      );
      expect(result.current.has_custom_slippage_option).toBe(
        defaultConfig.has_custom_slippage_option,
      );
    });
  });

  describe('Solana-specific configuration', () => {
    const solanaChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

    it('returns default config for Solana source without dest', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({ sourceChainId: solanaChainId }),
      );

      // No wildcard config for Solana, so defaults apply
      expect(result.current.default_slippage_options).toEqual(
        defaultConfig.default_slippage_options,
      );
    });

    it('returns Solana-specific config for Solana-to-Solana', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: solanaChainId,
          destChainId: solanaChainId,
        }),
      );

      expect(result.current.default_slippage_options).toEqual([
        'auto',
        '0.5',
        '2',
      ]);
    });

    it('has "auto" as first slippage option for Solana-to-Solana', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: solanaChainId,
          destChainId: solanaChainId,
        }),
      );

      expect(result.current.default_slippage_options[0]).toBe('auto');
    });

    it('preserves all other config values for Solana-to-Solana', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: solanaChainId,
          destChainId: solanaChainId,
        }),
      );

      expect(result.current.input_step).toBe(defaultConfig.input_step);
      expect(result.current.max_amount).toBe(defaultConfig.max_amount);
      expect(result.current.min_amount).toBe(defaultConfig.min_amount);
      expect(result.current.lower_allowed_slippage_threshold).toEqual(
        defaultConfig.lower_allowed_slippage_threshold,
      );
    });

    it('returns default config for Solana to non-Solana chain', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: solanaChainId,
          destChainId: 'eip155:1',
        }),
      );

      // No config for Solana->Ethereum, so defaults apply
      expect(result.current.default_slippage_options).toEqual(
        defaultConfig.default_slippage_options,
      );
    });
  });

  describe('deep merge behavior', () => {
    beforeEach(() => {
      (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'eip155:999'
      ] = {
        'eip155:888': {
          max_amount: 50,
          lower_allowed_slippage_threshold: {
            value: 1,
          },
        },
      };
    });

    afterEach(() => {
      delete (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'eip155:999'
      ];
    });

    it('deep merges nested threshold objects', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: 'eip155:999',
          destChainId: 'eip155:888',
        }),
      );

      expect(result.current.max_amount).toBe(50);
      expect(result.current.lower_allowed_slippage_threshold?.value).toBe(1);
      // Other threshold properties should be preserved from default
      expect(result.current.lower_allowed_slippage_threshold?.messageId).toBe(
        defaultConfig.lower_allowed_slippage_threshold?.messageId,
      );
      expect(result.current.lower_allowed_slippage_threshold?.inclusive).toBe(
        defaultConfig.lower_allowed_slippage_threshold?.inclusive,
      );
    });
  });

  describe('array replacement behavior', () => {
    beforeEach(() => {
      (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'eip155:996'
      ] = {
        'eip155:995': {
          default_slippage_options: ['10', '20'],
        },
      };
    });

    afterEach(() => {
      delete (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'eip155:996'
      ];
    });

    it('replaces arrays rather than merging them', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: 'eip155:996',
          destChainId: 'eip155:995',
        }),
      );

      // Array should be completely replaced, not merged
      expect(result.current.default_slippage_options).toEqual(['10', '20']);
      expect(result.current.default_slippage_options).toHaveLength(2);
    });
  });

  describe('null threshold override', () => {
    beforeEach(() => {
      (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'eip155:997'
      ] = {
        'eip155:998': {
          lower_suggested_slippage_threshold: null,
        },
      };
    });

    afterEach(() => {
      delete (AppConstants.BRIDGE.SLIPPAGE_CONFIG as Record<string, unknown>)[
        'eip155:997'
      ];
    });

    it('handles null threshold override', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: 'eip155:997',
          destChainId: 'eip155:998',
        }),
      );

      expect(result.current.lower_suggested_slippage_threshold).toBeNull();
      // Other thresholds remain intact
      expect(result.current.upper_suggested_slippage_threshold).toEqual(
        defaultConfig.upper_suggested_slippage_threshold,
      );
    });
  });

  describe('error handling', () => {
    it('returns default config for invalid hex chainId', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({ sourceChainId: '0xGGG' as `0x${string}` }),
      );

      expect(result.current).toEqual(defaultConfig);
    });

    it('returns default config for malformed CAIP chainId', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: 'invalid:format:chain' as `${string}:${string}`,
        }),
      );

      expect(result.current).toEqual(defaultConfig);
    });

    it('returns default config for non-numeric hex chainId', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({ sourceChainId: '0xZZZ' as `0x${string}` }),
      );

      expect(result.current).toEqual(defaultConfig);
    });

    it('returns default config for empty string sourceChainId', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({ sourceChainId: '' as `0x${string}` }),
      );

      expect(result.current).toEqual(defaultConfig);
    });

    it('returns default config when destChainId is invalid but sourceChainId is valid', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: 'eip155:1',
          destChainId: 'invalid:chain:id' as `${string}:${string}`,
        }),
      );

      expect(result.current).toEqual(defaultConfig);
    });
  });

  describe('config immutability', () => {
    it('does not mutate default config', () => {
      const originalDefault = JSON.parse(JSON.stringify(defaultConfig));

      renderHook(() =>
        useSlippageConfig({
          sourceChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          destChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        }),
      );

      expect(defaultConfig).toEqual(originalDefault);
    });
  });

  describe('config structure validation', () => {
    it('returns config with all required fields', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({ sourceChainId: '0x1' }),
      );

      expect(result.current).toHaveProperty('input_step');
      expect(result.current).toHaveProperty('max_amount');
      expect(result.current).toHaveProperty('min_amount');
      expect(result.current).toHaveProperty('input_max_decimals');
      expect(result.current).toHaveProperty('default_slippage_options');
      expect(result.current).toHaveProperty('has_custom_slippage_option');
    });

    it('returns config with correct types', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({ sourceChainId: '0x1' }),
      );

      expect(typeof result.current.input_step).toBe('number');
      expect(typeof result.current.max_amount).toBe('number');
      expect(typeof result.current.min_amount).toBe('number');
      expect(typeof result.current.input_max_decimals).toBe('number');
      expect(Array.isArray(result.current.default_slippage_options)).toBe(true);
      expect(typeof result.current.has_custom_slippage_option).toBe('boolean');
    });
  });

  describe('memoization', () => {
    it('returns consistent values for same inputs', () => {
      const { result: result1 } = renderHook(() =>
        useSlippageConfig({ sourceChainId: '0x1' }),
      );
      const { result: result2 } = renderHook(() =>
        useSlippageConfig({ sourceChainId: '0x1' }),
      );

      expect(result1.current).toEqual(result2.current);
    });

    it('returns consistent values for equivalent chain formats', () => {
      const { result: hexResult } = renderHook(() =>
        useSlippageConfig({ sourceChainId: '0x1' }),
      );
      const { result: caipResult } = renderHook(() =>
        useSlippageConfig({ sourceChainId: 'eip155:1' }),
      );

      expect(hexResult.current).toEqual(caipResult.current);
    });
  });

  describe('snapshots', () => {
    it('matches snapshot for empty options', () => {
      const { result } = renderHook(() => useSlippageConfig({}));
      expect(result.current).toMatchSnapshot();
    });

    it('matches snapshot for EVM chain', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({ sourceChainId: '0x1' }),
      );
      expect(result.current).toMatchSnapshot();
    });

    it('matches snapshot for Solana-to-Solana', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          destChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        }),
      );
      expect(result.current).toMatchSnapshot();
    });

    it('matches snapshot for cross-chain (no specific config)', () => {
      const { result } = renderHook(() =>
        useSlippageConfig({
          sourceChainId: 'eip155:1',
          destChainId: 'eip155:137',
        }),
      );
      expect(result.current).toMatchSnapshot();
    });
  });
});
