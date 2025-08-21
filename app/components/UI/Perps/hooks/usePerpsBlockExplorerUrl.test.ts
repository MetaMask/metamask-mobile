import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsBlockExplorerUrl } from './usePerpsBlockExplorerUrl';
import { PerpsController } from '../controllers';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => () => ({
    address: '0x1234567890abcdef1234567890abcdef12345678',
  })),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(() => () => ({
    address: '0x1234567890abcdef1234567890abcdef12345678',
  })),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getBlockExplorerUrl: jest.fn(),
    },
  },
}));

describe('usePerpsBlockExplorerUrl', () => {
  const mockController = {
    getBlockExplorerUrl: jest.fn(),
  };

  const mockSelectedAddress = '0x1234567890abcdef1234567890abcdef12345678';

  beforeEach(() => {
    jest.clearAllMocks();
    Engine.context.PerpsController =
      mockController as unknown as PerpsController;
    (useSelector as jest.Mock).mockReturnValue(() => ({
      address: mockSelectedAddress,
    }));
  });

  it('should return baseExplorerUrl from controller', () => {
    const baseUrl = 'https://app.hyperliquid.xyz/explorer';
    mockController.getBlockExplorerUrl.mockReturnValue(baseUrl);

    const { result } = renderHook(() => usePerpsBlockExplorerUrl());

    expect(result.current.baseExplorerUrl).toBe(baseUrl);
    expect(mockController.getBlockExplorerUrl).toHaveBeenCalledWith();
  });

  it('should return null baseExplorerUrl when controller throws error', () => {
    mockController.getBlockExplorerUrl.mockImplementation(() => {
      throw new Error('Controller error');
    });

    const { result } = renderHook(() => usePerpsBlockExplorerUrl());

    expect(result.current.baseExplorerUrl).toBeNull();
  });

  describe('getExplorerUrl', () => {
    it('should return URL with provided address', () => {
      const addressUrl = 'https://app.hyperliquid.xyz/explorer/address/0xabc';
      mockController.getBlockExplorerUrl.mockReturnValue(addressUrl);

      const { result } = renderHook(() => usePerpsBlockExplorerUrl());
      const url = result.current.getExplorerUrl('0xabc');

      expect(url).toBe(addressUrl);
      expect(mockController.getBlockExplorerUrl).toHaveBeenCalledWith('0xabc');
    });

    it('should use defaultAddress when no address provided', () => {
      const defaultAddress = '0xdef';
      const addressUrl = 'https://app.hyperliquid.xyz/explorer/address/0xdef';
      mockController.getBlockExplorerUrl.mockReturnValue(addressUrl);

      const { result } = renderHook(() =>
        usePerpsBlockExplorerUrl(defaultAddress),
      );
      const url = result.current.getExplorerUrl();

      expect(url).toBe(addressUrl);
      expect(mockController.getBlockExplorerUrl).toHaveBeenCalledWith(
        defaultAddress,
      );
    });

    it('should use selected address when no address or defaultAddress provided', () => {
      const addressUrl = `https://app.hyperliquid.xyz/explorer/address/${mockSelectedAddress}`;
      mockController.getBlockExplorerUrl.mockReturnValue(addressUrl);

      const { result } = renderHook(() => usePerpsBlockExplorerUrl());
      const url = result.current.getExplorerUrl();

      expect(url).toBe(addressUrl);
      expect(mockController.getBlockExplorerUrl).toHaveBeenCalledWith(
        mockSelectedAddress,
      );
    });

    it('should return null when no address available', () => {
      mockController.getBlockExplorerUrl.mockClear();
      (useSelector as jest.Mock).mockReturnValue(() => null);

      const { result } = renderHook(() => usePerpsBlockExplorerUrl());
      const url = result.current.getExplorerUrl();

      expect(url).toBeNull();
      // We can't test that getBlockExplorerUrl wasn't called because of the useMemo
    });

    it('should return null when controller throws error', () => {
      mockController.getBlockExplorerUrl.mockImplementation(() => {
        throw new Error('Controller error');
      });

      const { result } = renderHook(() => usePerpsBlockExplorerUrl());
      const url = result.current.getExplorerUrl('0xabc');

      expect(url).toBeNull();
    });

    it('should prioritize provided address over defaultAddress and selectedAddress', () => {
      const providedAddress = '0x123';
      const defaultAddress = '0x456';
      const addressUrl = `https://app.hyperliquid.xyz/explorer/address/${providedAddress}`;
      mockController.getBlockExplorerUrl.mockReturnValue(addressUrl);

      const { result } = renderHook(() =>
        usePerpsBlockExplorerUrl(defaultAddress),
      );
      const url = result.current.getExplorerUrl(providedAddress);

      expect(url).toBe(addressUrl);
      expect(mockController.getBlockExplorerUrl).toHaveBeenCalledWith(
        providedAddress,
      );
    });
  });

  it('should handle testnet URLs correctly', () => {
    const testnetUrl =
      'https://app.hyperliquid-testnet.xyz/explorer/address/0xabc';
    mockController.getBlockExplorerUrl.mockReturnValue(testnetUrl);

    const { result } = renderHook(() => usePerpsBlockExplorerUrl());
    const url = result.current.getExplorerUrl('0xabc');

    expect(url).toBe(testnetUrl);
  });

  it('should memoize baseExplorerUrl', () => {
    const baseUrl = 'https://app.hyperliquid.xyz/explorer';
    mockController.getBlockExplorerUrl.mockReturnValue(baseUrl);

    const { result, rerender } = renderHook(() => usePerpsBlockExplorerUrl());

    expect(mockController.getBlockExplorerUrl).toHaveBeenCalledTimes(1);

    rerender();

    expect(mockController.getBlockExplorerUrl).toHaveBeenCalledTimes(1);
    expect(result.current.baseExplorerUrl).toBe(baseUrl);
  });

  it('should update getExplorerUrl when dependencies change', () => {
    const address1 = '0x111';
    const address2 = '0x222';
    const url1 = `https://app.hyperliquid.xyz/explorer/address/${address1}`;
    const url2 = `https://app.hyperliquid.xyz/explorer/address/${address2}`;

    // We need to set this up to always return the appropriate URL based on the address passed
    mockController.getBlockExplorerUrl.mockImplementation((address) => {
      if (address === address1) return url1;
      if (address === address2) return url2;
      return '';
    });

    const { result, rerender } = renderHook(
      ({ defaultAddress }) => usePerpsBlockExplorerUrl(defaultAddress),
      { initialProps: { defaultAddress: address1 } },
    );

    expect(result.current.getExplorerUrl()).toBe(url1);

    rerender({ defaultAddress: address2 });

    expect(result.current.getExplorerUrl()).toBe(url2);
  });
});
