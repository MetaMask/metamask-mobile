import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import StorageWrapper from '../../store/storage-wrapper';
import {
  useSafeChains,
  rpcIdentifierUtility,
  SafeChain,
  resetChainsListCache,
} from './useSafeChains';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../store/storage-wrapper', () => ({
  setItem: jest.fn(),
}));

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
}));

describe('useSafeChains', () => {
  const mockSafeChains: SafeChain[] = [
    {
      chainId: 1,
      name: 'Ethereum Mainnet',
      nativeCurrency: { symbol: 'ETH' },
      rpc: ['https://mainnet.infura.io/v3/123'],
    },
    {
      chainId: 137,
      name: 'Polygon Mainnet',
      nativeCurrency: { symbol: 'MATIC' },
      rpc: ['https://polygon-rpc.com'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    resetChainsListCache();
    global.fetch = jest.fn();
  });

  it('should fetch and store safe chains when validation is enabled', async () => {
    (useSelector as jest.Mock).mockReturnValue(true);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSafeChains),
    });

    const { result, waitForNextUpdate } = renderHook(() => useSafeChains());

    await waitForNextUpdate();

    expect(result.current.safeChains).toEqual(mockSafeChains);
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      'SAFE_CHAINS_CACHE',
      JSON.stringify(mockSafeChains),
    );
  });

  it('should handle fetch errors', async () => {
    (useSelector as jest.Mock).mockReturnValue(true);
    const mockError = new Error('Network error');
    (global.fetch as jest.Mock).mockRejectedValueOnce(mockError);

    const { result, waitForNextUpdate } = renderHook(() => useSafeChains());

    await waitForNextUpdate();

    expect(result.current.error).toBe(mockError);
  });

  it('should handle invalid response format', async () => {
    (useSelector as jest.Mock).mockReturnValue(true);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve('invalid-data'),
    });

    const { result, waitForNextUpdate } = renderHook(() => useSafeChains());

    await waitForNextUpdate();

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe(
      'Invalid chains data format',
    );
  });

  it('should not fetch chains when validation is disabled', () => {
    (useSelector as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useSafeChains());

    expect(result.current.safeChains).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('clears cache on failure to allow retries', async () => {
    (useSelector as jest.Mock).mockReturnValue(true);
    const mockError = new Error('Network error');

    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSafeChains),
      });

    const { result: firstResult, waitForNextUpdate: firstWait } = renderHook(
      () => useSafeChains(),
    );

    await firstWait();

    expect(firstResult.current.error).toBe(mockError);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const { result: secondResult, waitForNextUpdate: secondWait } = renderHook(
      () => useSafeChains(),
    );

    await secondWait();

    expect(secondResult.current.safeChains).toEqual(mockSafeChains);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('rpcIdentifierUtility', () => {
  const mockSafeChains: SafeChain[] = [
    {
      chainId: 1,
      name: 'Ethereum Mainnet',
      nativeCurrency: { symbol: 'ETH' },
      rpc: ['https://mainnet.infura.io/v3/123'],
    },
    {
      chainId: 137,
      name: 'Polygon Mainnet',
      nativeCurrency: { symbol: 'MATIC' },
      rpc: ['https://polygon-rpc.com'],
    },
  ];

  it('should identify a matching RPC URL', () => {
    const result = rpcIdentifierUtility(
      'https://mainnet.infura.io/v3/123',
      mockSafeChains,
    );

    expect(result.safeChain).toEqual(mockSafeChains[0]);
    expect(result.safeRPCUrl).toBe('mainnet.infura.io');
  });

  it('should handle invalid RPC URL', () => {
    const result = rpcIdentifierUtility('invalid-url', mockSafeChains);

    expect(result.safeChain).toEqual({
      chainId: '',
      nativeCurrency: { symbol: '' },
    });
    expect(result.safeRPCUrl).toBe('Invalid rpcUrl');
  });

  it('should handle unknown RPC URL', () => {
    const result = rpcIdentifierUtility(
      'https://unknown-rpc.com',
      mockSafeChains,
    );

    expect(result.safeChain).toEqual({
      chainId: '',
      nativeCurrency: { symbol: '' },
    });
    expect(result.safeRPCUrl).toBe('Unknown rpcUrl');
  });

  it('should handle invalid RPC URLs in chain data', () => {
    const chainsWithInvalidRpc = [
      {
        ...mockSafeChains[0],
        rpc: ['invalid-rpc-url'],
      },
    ];

    const result = rpcIdentifierUtility(
      'https://mainnet.infura.io/v3/123',
      chainsWithInvalidRpc,
    );

    expect(result.safeChain).toEqual({
      chainId: '',
      nativeCurrency: { symbol: '' },
    });
    expect(result.safeRPCUrl).toBe('Unknown rpcUrl');
  });
});
