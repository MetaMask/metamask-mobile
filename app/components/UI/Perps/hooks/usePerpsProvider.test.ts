import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsProvider } from './usePerpsProvider';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      switchProvider: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  // Default: hyperliquid active, MYX flag off
  mockUseSelector.mockImplementation((selector: unknown) => {
    const fn = selector as (s: unknown) => unknown;
    const fakeState = {};
    // First call = selectPerpsProvider, second = selectPerpsMYXProviderEnabledFlag
    const result = fn(fakeState);
    return result ?? 'hyperliquid';
  });
});

describe('usePerpsProvider', () => {
  describe('availableProviders', () => {
    it('includes only hyperliquid when MYX flag is disabled', () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid') // activeProvider
        .mockReturnValueOnce(false); // isMYXProviderEnabled

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.availableProviders).toEqual(['hyperliquid']);
    });

    it('includes myx and aggregated when MYX flag is enabled', () => {
      mockUseSelector
        .mockReturnValueOnce('myx') // activeProvider
        .mockReturnValueOnce(true); // isMYXProviderEnabled

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.availableProviders).toEqual([
        'hyperliquid',
        'myx',
        'aggregated',
      ]);
    });
  });

  describe('activeProvider', () => {
    it('returns current active provider from selector', () => {
      mockUseSelector.mockReturnValueOnce('myx').mockReturnValueOnce(true);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.activeProvider).toBe('myx');
    });
  });

  describe('switchProvider', () => {
    it('calls PerpsController.switchProvider with the given providerId', async () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid')
        .mockReturnValueOnce(false);
      (
        Engine.context.PerpsController.switchProvider as jest.Mock
      ).mockResolvedValue({ success: true });

      const { result } = renderHook(() => usePerpsProvider());
      await result.current.switchProvider('myx');

      expect(
        Engine.context.PerpsController.switchProvider,
      ).toHaveBeenCalledWith('myx');
    });

    it('returns the result from PerpsController.switchProvider', async () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid')
        .mockReturnValueOnce(false);
      const mockResult = { success: false, error: 'Not supported' };
      (
        Engine.context.PerpsController.switchProvider as jest.Mock
      ).mockResolvedValue(mockResult);

      const { result } = renderHook(() => usePerpsProvider());
      const response = await result.current.switchProvider('myx');

      expect(response).toEqual(mockResult);
    });
  });

  describe('isProviderAvailable', () => {
    it('returns true for available provider', () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid')
        .mockReturnValueOnce(false);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isProviderAvailable('hyperliquid')).toBe(true);
    });

    it('returns false for unavailable provider when flag is off', () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid')
        .mockReturnValueOnce(false);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isProviderAvailable('myx')).toBe(false);
    });
  });

  describe('isMYXProvider / isHyperLiquidProvider / isMultiProviderEnabled', () => {
    it('isMYXProvider is true when activeProvider is myx', () => {
      mockUseSelector.mockReturnValueOnce('myx').mockReturnValueOnce(true);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isMYXProvider).toBe(true);
      expect(result.current.isHyperLiquidProvider).toBe(false);
    });

    it('isHyperLiquidProvider is true when activeProvider is hyperliquid', () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid')
        .mockReturnValueOnce(false);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isHyperLiquidProvider).toBe(true);
      expect(result.current.isMYXProvider).toBe(false);
    });

    it('isMultiProviderEnabled is false when only one provider available', () => {
      mockUseSelector
        .mockReturnValueOnce('hyperliquid')
        .mockReturnValueOnce(false);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isMultiProviderEnabled).toBe(false);
    });

    it('isMultiProviderEnabled is true when multiple providers available', () => {
      mockUseSelector.mockReturnValueOnce('myx').mockReturnValueOnce(true);

      const { result } = renderHook(() => usePerpsProvider());

      expect(result.current.isMultiProviderEnabled).toBe(true);
    });
  });
});
