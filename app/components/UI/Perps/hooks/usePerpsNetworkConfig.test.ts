import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePerpsNetworkConfig } from './usePerpsNetworkConfig';
import type {
  PerpsProviderType,
  SwitchProviderResult,
  ToggleTestnetResult,
} from '../controllers/types';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      toggleTestnet: jest.fn(),
      getCurrentNetwork: jest.fn(),
      switchProvider: jest.fn(),
      disconnect: jest.fn(),
    },
  },
}));

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

describe('usePerpsNetworkConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toggleTestnet', () => {
    it('should call PerpsController.toggleTestnet and return result', async () => {
      const mockToggleResult: ToggleTestnetResult = {
        success: true,
        isTestnet: true,
      };

      (
        Engine.context.PerpsController.toggleTestnet as jest.Mock
      ).mockResolvedValue(mockToggleResult);

      const { result } = renderHook(() => usePerpsNetworkConfig());

      const response = await result.current.toggleTestnet();

      expect(Engine.context.PerpsController.toggleTestnet).toHaveBeenCalled();
      expect(response).toEqual(mockToggleResult);
    });

    it('should handle toggleTestnet errors', async () => {
      const mockError = new Error('Network toggle failed');
      (
        Engine.context.PerpsController.toggleTestnet as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePerpsNetworkConfig());

      await expect(result.current.toggleTestnet()).rejects.toThrow(
        'Network toggle failed',
      );
    });

    it('should switch from mainnet to testnet', async () => {
      const mockToggleResult: ToggleTestnetResult = {
        success: true,
        isTestnet: true,
      };

      (
        Engine.context.PerpsController.toggleTestnet as jest.Mock
      ).mockResolvedValue(mockToggleResult);

      const { result } = renderHook(() => usePerpsNetworkConfig());

      const response = await result.current.toggleTestnet();

      expect(response.isTestnet).toBe(true);
    });

    it('should switch from testnet to mainnet', async () => {
      const mockToggleResult: ToggleTestnetResult = {
        success: true,
        isTestnet: false,
      };

      (
        Engine.context.PerpsController.toggleTestnet as jest.Mock
      ).mockResolvedValue(mockToggleResult);

      const { result } = renderHook(() => usePerpsNetworkConfig());

      const response = await result.current.toggleTestnet();

      expect(response.isTestnet).toBe(false);
    });
  });

  describe('getCurrentNetwork', () => {
    it('should return mainnet when on mainnet', () => {
      (
        Engine.context.PerpsController.getCurrentNetwork as jest.Mock
      ).mockReturnValue('mainnet');

      const { result } = renderHook(() => usePerpsNetworkConfig());

      const network = result.current.getCurrentNetwork();

      expect(
        Engine.context.PerpsController.getCurrentNetwork,
      ).toHaveBeenCalled();
      expect(network).toBe('mainnet');
    });

    it('should return testnet when on testnet', () => {
      (
        Engine.context.PerpsController.getCurrentNetwork as jest.Mock
      ).mockReturnValue('testnet');

      const { result } = renderHook(() => usePerpsNetworkConfig());

      const network = result.current.getCurrentNetwork();

      expect(network).toBe('testnet');
    });

    it('should handle getCurrentNetwork errors', () => {
      const mockError = new Error('Unable to get network');
      (
        Engine.context.PerpsController.getCurrentNetwork as jest.Mock
      ).mockImplementation(() => {
        throw mockError;
      });

      const { result } = renderHook(() => usePerpsNetworkConfig());

      expect(() => result.current.getCurrentNetwork()).toThrow(
        'Unable to get network',
      );
    });
  });

  describe('switchProvider', () => {
    it('should call PerpsController.switchProvider with correct parameters', async () => {
      const mockSwitchResult: SwitchProviderResult = {
        success: true,
        providerId: 'hyperliquid',
      };

      (
        Engine.context.PerpsController.switchProvider as jest.Mock
      ).mockResolvedValue(mockSwitchResult);

      const { result } = renderHook(() => usePerpsNetworkConfig());

      const response = await result.current.switchProvider('hyperliquid');

      expect(
        Engine.context.PerpsController.switchProvider,
      ).toHaveBeenCalledWith('hyperliquid');
      expect(response).toEqual(mockSwitchResult);
    });

    it('should handle switchProvider errors', async () => {
      const mockError = new Error('Provider switch failed');
      (
        Engine.context.PerpsController.switchProvider as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePerpsNetworkConfig());

      await expect(result.current.switchProvider('myx')).rejects.toThrow(
        'Provider switch failed',
      );
    });

    it('should handle switching between different providers', async () => {
      const providers: PerpsProviderType[] = ['hyperliquid', 'myx'];

      for (const provider of providers) {
        const mockSwitchResult: SwitchProviderResult = {
          success: true,
          providerId: provider,
        };

        (
          Engine.context.PerpsController.switchProvider as jest.Mock
        ).mockResolvedValue(mockSwitchResult);

        const { result } = renderHook(() => usePerpsNetworkConfig());

        const response = await result.current.switchProvider(provider);

        expect(response.providerId).toBe(provider);
      }
    });
  });

  describe('disconnect', () => {
    it('should call PerpsController.disconnect', async () => {
      (
        Engine.context.PerpsController.disconnect as jest.Mock
      ).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePerpsNetworkConfig());

      await result.current.disconnect();

      expect(Engine.context.PerpsController.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect errors', async () => {
      const mockError = new Error('Disconnect failed');
      (
        Engine.context.PerpsController.disconnect as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePerpsNetworkConfig());

      await expect(result.current.disconnect()).rejects.toThrow(
        'Disconnect failed',
      );
    });

    it('should handle multiple disconnect calls', async () => {
      (
        Engine.context.PerpsController.disconnect as jest.Mock
      ).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePerpsNetworkConfig());

      // Call disconnect multiple times
      await result.current.disconnect();
      await result.current.disconnect();
      await result.current.disconnect();

      expect(Engine.context.PerpsController.disconnect).toHaveBeenCalledTimes(
        3,
      );
    });
  });

  describe('hook stability', () => {
    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => usePerpsNetworkConfig());

      const initialFunctions = { ...result.current };

      rerender({});

      const updatedFunctions = { ...result.current };

      // All functions should maintain the same reference
      expect(initialFunctions.toggleTestnet).toBe(
        updatedFunctions.toggleTestnet,
      );
      expect(initialFunctions.getCurrentNetwork).toBe(
        updatedFunctions.getCurrentNetwork,
      );
      expect(initialFunctions.switchProvider).toBe(
        updatedFunctions.switchProvider,
      );
      expect(initialFunctions.disconnect).toBe(updatedFunctions.disconnect);
    });

    it('should memoize the returned object', () => {
      const { result, rerender } = renderHook(() => usePerpsNetworkConfig());

      const initialResult = result.current;

      rerender({});

      const updatedResult = result.current;

      // The entire object should be the same reference due to useMemo
      expect(initialResult).toBe(updatedResult);
    });
  });

  describe('integration scenarios', () => {
    it('should handle network toggle followed by provider switch', async () => {
      const mockToggleResult: ToggleTestnetResult = {
        success: true,
        isTestnet: true,
      };

      const mockSwitchResult: SwitchProviderResult = {
        success: true,
        providerId: 'myx',
      };

      (
        Engine.context.PerpsController.toggleTestnet as jest.Mock
      ).mockResolvedValue(mockToggleResult);
      (
        Engine.context.PerpsController.switchProvider as jest.Mock
      ).mockResolvedValue(mockSwitchResult);

      const { result } = renderHook(() => usePerpsNetworkConfig());

      // Toggle to testnet
      const toggleResponse = await result.current.toggleTestnet();
      expect(toggleResponse.isTestnet).toBe(true);

      // Switch provider on testnet
      const switchResponse = await result.current.switchProvider('myx');
      expect(switchResponse.providerId).toBe('myx');
    });

    it('should handle getCurrentNetwork after toggle', async () => {
      const mockToggleResult: ToggleTestnetResult = {
        success: true,
        isTestnet: true,
      };

      (
        Engine.context.PerpsController.toggleTestnet as jest.Mock
      ).mockResolvedValue(mockToggleResult);
      (Engine.context.PerpsController.getCurrentNetwork as jest.Mock)
        .mockReturnValueOnce('mainnet')
        .mockReturnValueOnce('testnet');

      const { result } = renderHook(() => usePerpsNetworkConfig());

      // Check initial network
      expect(result.current.getCurrentNetwork()).toBe('mainnet');

      // Toggle network
      await result.current.toggleTestnet();

      // Check network after toggle
      expect(result.current.getCurrentNetwork()).toBe('testnet');
    });
  });
});
