import { renderHook, waitFor, act } from '@testing-library/react-native';
import { ethers } from 'ethers';
import useGetLatestAllowanceForPriorityToken from './useGetLatestAllowanceForPriorityToken';
import { useCardSDK } from '../sdk';
import { CardTokenAllowance, AllowanceState } from '../types';
import Logger from '../../../../util/Logger';
import {
  SPENDING_LIMIT_UNSUPPORTED_TOKENS,
  caipChainIdToNetwork,
} from '../constants';

// Mock dependencies
jest.mock('../sdk');
jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('ethers', () => ({
  ethers: {
    utils: {
      isAddress: jest.fn(),
      parseUnits: jest.fn(),
      formatUnits: jest.fn(),
    },
  },
}));

const mockIsNonEvmChainId = jest.fn();
jest.mock('../../../../core/Multichain/utils', () => ({
  isNonEvmChainId: (...args: unknown[]) => mockIsNonEvmChainId(...args),
}));

describe('useGetLatestAllowanceForPriorityToken', () => {
  const mockSDK = {
    getLatestAllowanceFromLogs: jest.fn(),
    lineaChainId: 'eip155:59144',
  };

  const createMockToken = (
    overrides: Partial<CardTokenAllowance> = {},
  ): CardTokenAllowance => ({
    address: '0x1234567890123456789012345678901234567890',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    walletAddress: '0x0987654321098765432109876543210987654321',
    caipChainId: 'eip155:59144',
    allowanceState: AllowanceState.Limited,
    allowance: '11.806489',
    availableBalance: '11.806489',
    delegationContract: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    stagingTokenAddress: null,
    priority: 1,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    (ethers.utils.isAddress as jest.Mock).mockReturnValue(true);
    (ethers.utils.parseUnits as jest.Mock).mockReturnValue({
      toString: () => '11806489',
    });
    (ethers.utils.formatUnits as jest.Mock).mockReturnValue('15.0');
    // Default: EVM chains return false (not non-EVM)
    mockIsNonEvmChainId.mockReturnValue(false);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns null when SDK is not available', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });
    const mockToken = createMockToken();

    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(mockToken),
    );

    await waitFor(() => {
      expect(result.current.latestAllowance).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('returns null when priorityToken is null', async () => {
    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(null),
    );

    await waitFor(() => {
      expect(result.current.latestAllowance).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('skips fetch when allowanceState is not Limited', async () => {
    const mockToken = createMockToken({
      allowanceState: AllowanceState.Enabled,
    });

    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(mockToken),
    );

    await waitFor(() => {
      expect(mockSDK.getLatestAllowanceFromLogs).not.toHaveBeenCalled();
      expect(result.current.latestAllowance).toBeNull();
    });
  });

  it('skips fetch when allowanceState is NotEnabled', async () => {
    const mockToken = createMockToken({
      allowanceState: AllowanceState.NotEnabled,
    });

    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(mockToken),
    );

    await waitFor(() => {
      expect(mockSDK.getLatestAllowanceFromLogs).not.toHaveBeenCalled();
      expect(result.current.latestAllowance).toBeNull();
    });
  });

  it('skips fetch for non-EVM chains', async () => {
    // Mock isNonEvmChainId to return true for Solana
    mockIsNonEvmChainId.mockReturnValue(true);
    const mockToken = createMockToken({
      caipChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    });

    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(mockToken),
    );

    await waitFor(() => {
      expect(mockSDK.getLatestAllowanceFromLogs).not.toHaveBeenCalled();
      expect(result.current.latestAllowance).toBeNull();
    });
  });

  it('skips fetch when token address is invalid', async () => {
    (ethers.utils.isAddress as jest.Mock).mockReturnValue(false);
    const mockToken = createMockToken();

    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(mockToken),
    );

    await waitFor(() => {
      expect(mockSDK.getLatestAllowanceFromLogs).not.toHaveBeenCalled();
      expect(result.current.latestAllowance).toBeNull();
    });
  });

  it('skips fetch when delegation contract is missing', async () => {
    const mockToken = createMockToken({
      delegationContract: undefined,
    });

    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(mockToken),
    );

    await waitFor(() => {
      expect(mockSDK.getLatestAllowanceFromLogs).not.toHaveBeenCalled();
      expect(result.current.latestAllowance).toBeNull();
    });
  });

  it('fetches and formats latest allowance successfully', async () => {
    mockSDK.getLatestAllowanceFromLogs.mockResolvedValue('15000000');
    const mockToken = createMockToken();

    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(mockToken),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.latestAllowance).toBe('15.0');
    expect(result.current.error).toBeNull();
    expect(mockSDK.getLatestAllowanceFromLogs).toHaveBeenCalledWith(
      mockToken.walletAddress,
      mockToken.address,
      mockToken.delegationContract,
      caipChainIdToNetwork[mockToken.caipChainId] ?? 'linea',
    );
  });

  it('uses staging token address when available', async () => {
    mockSDK.getLatestAllowanceFromLogs.mockResolvedValue('15000000');
    const mockToken = createMockToken({
      stagingTokenAddress: '0xstagingtokenaddress123456789012345678',
    });

    renderHook(() => useGetLatestAllowanceForPriorityToken(mockToken));

    await waitFor(() => {
      expect(mockSDK.getLatestAllowanceFromLogs).toHaveBeenCalledWith(
        mockToken.walletAddress,
        '0xstagingtokenaddress123456789012345678',
        mockToken.delegationContract,
        caipChainIdToNetwork[mockToken.caipChainId] ?? 'linea',
      );
    });
  });

  it('returns null when SDK returns null', async () => {
    mockSDK.getLatestAllowanceFromLogs.mockResolvedValue(null);
    const mockToken = createMockToken();

    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(mockToken),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.latestAllowance).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('handles errors and logs them', async () => {
    const mockError = new Error('RPC failure');
    mockSDK.getLatestAllowanceFromLogs.mockRejectedValue(mockError);
    const mockToken = createMockToken();

    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(mockToken),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.latestAllowance).toBeNull();
    expect(result.current.error).toEqual(mockError);
    expect(Logger.error).toHaveBeenCalledWith(
      mockError,
      'useGetLatestAllowanceForPriorityToken: Failed to fetch latest allowance',
    );
  });

  it('converts non-Error to Error when catching', async () => {
    mockSDK.getLatestAllowanceFromLogs.mockRejectedValue('string error');
    const mockToken = createMockToken();

    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(mockToken),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('string error');
  });

  it('refetch function triggers new fetch', async () => {
    mockSDK.getLatestAllowanceFromLogs
      .mockResolvedValueOnce('15000000')
      .mockResolvedValueOnce('20000000');
    const mockToken = createMockToken();

    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(mockToken),
    );

    await waitFor(() => {
      expect(result.current.latestAllowance).toBe('15.0');
    });

    (ethers.utils.formatUnits as jest.Mock).mockReturnValue('20.0');

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.latestAllowance).toBe('20.0');
    });

    expect(mockSDK.getLatestAllowanceFromLogs).toHaveBeenCalledTimes(2);
  });

  it('sets loading state correctly during fetch', async () => {
    mockSDK.getLatestAllowanceFromLogs.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('15000000'), 100);
        }),
    );
    const mockToken = createMockToken();

    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(mockToken),
    );

    // Hook starts fetching immediately, so loading should be true
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Wait for loading to complete
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 200 },
    );

    expect(result.current.latestAllowance).toBe('15.0');
  });

  it('converts allowance from wei to human-readable format', async () => {
    mockSDK.getLatestAllowanceFromLogs.mockResolvedValue('15000000');
    const mockToken = createMockToken({ decimals: 6 });
    (ethers.utils.formatUnits as jest.Mock).mockReturnValue('15.0');

    renderHook(() => useGetLatestAllowanceForPriorityToken(mockToken));

    await waitFor(() => {
      expect(ethers.utils.formatUnits).toHaveBeenCalledWith('15000000', 6);
    });
  });

  it('handles missing wallet address', async () => {
    const mockToken = createMockToken({
      walletAddress: undefined as unknown as string,
    });

    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(mockToken),
    );

    await waitFor(() => {
      expect(mockSDK.getLatestAllowanceFromLogs).not.toHaveBeenCalled();
      expect(result.current.latestAllowance).toBeNull();
    });
  });

  it('handles missing decimals', async () => {
    const mockToken = createMockToken({
      decimals: undefined as unknown as number,
    });

    const { result } = renderHook(() =>
      useGetLatestAllowanceForPriorityToken(mockToken),
    );

    await waitFor(() => {
      expect(mockSDK.getLatestAllowanceFromLogs).not.toHaveBeenCalled();
      expect(result.current.latestAllowance).toBeNull();
    });
  });

  describe('unsupported tokens', () => {
    beforeEach(() => {
      // Mock the includes method to return true only for AUSDC
      jest
        .spyOn(SPENDING_LIMIT_UNSUPPORTED_TOKENS, 'includes')
        .mockImplementation((symbol: string) => symbol === 'AUSDC');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('skips fetch for unsupported token (aUSDC)', async () => {
      const mockToken = createMockToken({
        symbol: 'aUSDC',
      });

      const { result } = renderHook(() =>
        useGetLatestAllowanceForPriorityToken(mockToken),
      );

      await waitFor(() => {
        expect(mockSDK.getLatestAllowanceFromLogs).not.toHaveBeenCalled();
        expect(result.current.latestAllowance).toBeNull();
      });
    });

    it('skips fetch for unsupported token with lowercase symbol', async () => {
      const mockToken = createMockToken({
        symbol: 'ausdc',
      });

      const { result } = renderHook(() =>
        useGetLatestAllowanceForPriorityToken(mockToken),
      );

      await waitFor(() => {
        expect(mockSDK.getLatestAllowanceFromLogs).not.toHaveBeenCalled();
        expect(result.current.latestAllowance).toBeNull();
      });
    });

    it('skips fetch for unsupported token with mixed case symbol', async () => {
      const mockToken = createMockToken({
        symbol: 'AuSdC',
      });

      const { result } = renderHook(() =>
        useGetLatestAllowanceForPriorityToken(mockToken),
      );

      await waitFor(() => {
        expect(mockSDK.getLatestAllowanceFromLogs).not.toHaveBeenCalled();
        expect(result.current.latestAllowance).toBeNull();
      });
    });

    it('fetches normally for supported tokens', async () => {
      mockSDK.getLatestAllowanceFromLogs.mockResolvedValue('15000000');
      const mockToken = createMockToken({
        symbol: 'USDC',
      });

      const { result } = renderHook(() =>
        useGetLatestAllowanceForPriorityToken(mockToken),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSDK.getLatestAllowanceFromLogs).toHaveBeenCalledWith(
        mockToken.walletAddress,
        mockToken.address,
        mockToken.delegationContract,
        caipChainIdToNetwork[mockToken.caipChainId] ?? 'linea',
      );
      expect(result.current.latestAllowance).toBe('15.0');
    });

    it('fetches normally when token symbol is undefined', async () => {
      mockSDK.getLatestAllowanceFromLogs.mockResolvedValue('15000000');
      const mockToken = createMockToken({
        symbol: undefined as unknown as string,
      });

      const { result } = renderHook(() =>
        useGetLatestAllowanceForPriorityToken(mockToken),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSDK.getLatestAllowanceFromLogs).toHaveBeenCalled();
      expect(result.current.latestAllowance).toBe('15.0');
    });
  });
});
