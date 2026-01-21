import { renderHook, act } from '@testing-library/react-native';
import { usePerpsProvider } from './usePerpsProvider';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type {
  PerpsProviderInfo,
  SwitchProviderResult,
} from '../controllers/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getAvailableProviders: jest.fn(),
      setActiveProvider: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockGetAvailableProviders = Engine.context.PerpsController
  .getAvailableProviders as jest.MockedFunction<() => PerpsProviderInfo[]>;
const mockSetActiveProvider = Engine.context.PerpsController
  .setActiveProvider as jest.MockedFunction<
  (providerId: string) => Promise<SwitchProviderResult>
>;

const mockProviders: PerpsProviderInfo[] = [
  {
    id: 'hyperliquid',
    name: 'HyperLiquid',
    chain: 'Arbitrum',
    collateral: 'USDC',
    collateralSymbol: 'USDC',
    chainId: '42161',
    iconUrl: 'https://example.com/hl.png',
    enabled: true,
  },
  {
    id: 'myx',
    name: 'MYX',
    chain: 'BNB Chain',
    collateral: 'USDT',
    collateralSymbol: 'USDT',
    chainId: '56',
    iconUrl: 'https://example.com/myx.png',
    enabled: true,
  },
];

describe('usePerpsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue('hyperliquid');
    mockGetAvailableProviders.mockReturnValue(mockProviders);
  });

  describe('initial state', () => {
    it('returns activeProvider from selector', () => {
      const { result } = renderHook(() => usePerpsProvider());
      expect(result.current.activeProvider).toBe('hyperliquid');
    });

    it('returns availableProviders from controller', () => {
      const { result } = renderHook(() => usePerpsProvider());
      expect(result.current.availableProviders).toEqual(mockProviders);
    });

    it('returns currentProviderInfo for active provider', () => {
      const { result } = renderHook(() => usePerpsProvider());
      expect(result.current.currentProviderInfo).toEqual(mockProviders[0]);
    });

    it('returns hasMultipleProviders true when multiple providers available', () => {
      const { result } = renderHook(() => usePerpsProvider());
      expect(result.current.hasMultipleProviders).toBe(true);
    });

    it('returns hasMultipleProviders false when only one provider', () => {
      mockGetAvailableProviders.mockReturnValue([mockProviders[0]]);
      const { result } = renderHook(() => usePerpsProvider());
      expect(result.current.hasMultipleProviders).toBe(false);
    });
  });

  describe('setActiveProvider', () => {
    it('calls controller setActiveProvider with correct providerId', async () => {
      mockSetActiveProvider.mockResolvedValue({
        success: true,
        providerId: 'myx',
      });

      const { result } = renderHook(() => usePerpsProvider());

      await act(async () => {
        await result.current.setActiveProvider('myx');
      });

      expect(mockSetActiveProvider).toHaveBeenCalledWith('myx');
    });

    it('returns success result from controller', async () => {
      const successResult: SwitchProviderResult = {
        success: true,
        providerId: 'myx',
      };
      mockSetActiveProvider.mockResolvedValue(successResult);

      const { result } = renderHook(() => usePerpsProvider());

      let switchResult: SwitchProviderResult | undefined;
      await act(async () => {
        switchResult = await result.current.setActiveProvider('myx');
      });

      expect(switchResult).toEqual(successResult);
    });

    it('returns error result when switch fails', async () => {
      const errorResult: SwitchProviderResult = {
        success: false,
        providerId: 'hyperliquid',
        error: 'Provider not available',
      };
      mockSetActiveProvider.mockResolvedValue(errorResult);

      const { result } = renderHook(() => usePerpsProvider());

      let switchResult: SwitchProviderResult | undefined;
      await act(async () => {
        switchResult = await result.current.setActiveProvider('myx');
      });

      expect(switchResult?.success).toBe(false);
      expect(switchResult?.error).toBe('Provider not available');
    });

    it('handles controller errors gracefully', async () => {
      mockSetActiveProvider.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePerpsProvider());

      let switchResult: SwitchProviderResult | undefined;
      await act(async () => {
        switchResult = await result.current.setActiveProvider('myx');
      });

      expect(switchResult?.success).toBe(false);
      expect(switchResult?.error).toContain('Network error');
    });
  });

  describe('currentProviderInfo', () => {
    it('updates when activeProvider changes', () => {
      mockUseSelector.mockReturnValue('myx');

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.currentProviderInfo).toEqual(mockProviders[1]);
    });

    it('returns undefined when activeProvider not found', () => {
      mockUseSelector.mockReturnValue('unknown');

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.currentProviderInfo).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('returns empty providers when getAvailableProviders throws', () => {
      mockGetAvailableProviders.mockImplementation(() => {
        throw new Error('Controller error');
      });

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.availableProviders).toEqual([]);
      expect(result.current.hasMultipleProviders).toBe(false);
    });
  });
});
