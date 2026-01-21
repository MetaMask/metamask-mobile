import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNeedsGasFaucet } from './useNeedsGasFaucet';
import { useAccountNativeBalance } from '../../../Views/confirmations/hooks/useAccountNativeBalance';
import { useLatestBalance } from '../../Bridge/hooks/useLatestBalance';
import Engine from '../../../../core/Engine';
import { CardTokenAllowance, AllowanceState } from '../types';
import { BigNumber } from 'ethers';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../Views/confirmations/hooks/useAccountNativeBalance', () => ({
  useAccountNativeBalance: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    GasFeeController: {
      fetchGasFeeEstimates: jest.fn(),
    },
  },
}));

jest.mock('@metamask/bridge-controller', () => ({
  isNonEvmChainId: jest.fn((chainId: string) => chainId.startsWith('solana:')),
  isSolanaChainId: jest.fn((chainId: string) => chainId.startsWith('solana:')),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseAccountNativeBalance =
  useAccountNativeBalance as jest.MockedFunction<
    typeof useAccountNativeBalance
  >;
const mockUseLatestBalance = useLatestBalance as jest.MockedFunction<
  typeof useLatestBalance
>;

// Helper to create mock token
const createMockToken = (
  overrides: Partial<CardTokenAllowance> = {},
): CardTokenAllowance => ({
  address: '0x1234567890123456789012345678901234567890',
  caipChainId: 'eip155:59144', // Linea
  decimals: 18,
  symbol: 'USDC',
  name: 'USD Coin',
  allowanceState: AllowanceState.Enabled,
  allowance: '1000',
  availableBalance: '500',
  walletAddress: '0xwallet1',
  delegationContract: '0xdelegation123',
  ...overrides,
});

describe('useNeedsGasFaucet', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseSelector.mockImplementation((selector) => {
      // selectSelectedInternalAccountFormattedAddress
      if (selector.toString().includes('AccountFormattedAddress')) {
        return '0xUserAddress123';
      }
      // selectMinSolBalance
      return '0.00089'; // Default minimum SOL balance for rent exemption
    });

    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0x0',
    });

    mockUseLatestBalance.mockReturnValue(undefined);

    // Default gas fee estimate (EIP-1559)
    (
      Engine.context.GasFeeController.fetchGasFeeEstimates as jest.Mock
    ).mockResolvedValue({
      gasEstimateType: GAS_ESTIMATE_TYPES.FEE_MARKET,
      gasFeeEstimates: {
        high: {
          suggestedMaxFeePerGas: '20', // 20 Gwei
        },
      },
    });
  });

  describe('initial state', () => {
    it('initializes with loading state true', () => {
      const { result } = renderHook(() => useNeedsGasFaucet(null));

      // Initial state should show not loading when no token
      expect(result.current.isLoading).toBe(false);
      expect(result.current.needsFaucet).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('returns needsFaucet false when no token is provided', () => {
      const { result } = renderHook(() => useNeedsGasFaucet(null));

      expect(result.current.needsFaucet).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('returns needsFaucet false when token has no caipChainId', () => {
      const mockToken = createMockToken({ caipChainId: undefined });

      const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

      expect(result.current.needsFaucet).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('EVM chains (Linea/Base)', () => {
    describe('when user has sufficient balance for gas', () => {
      it('returns needsFaucet false when balance exceeds estimated gas', async () => {
        const mockToken = createMockToken({ caipChainId: 'eip155:59144' }); // Linea

        // User has 0.01 ETH (10^16 wei)
        mockUseAccountNativeBalance.mockReturnValue({
          balanceWeiInHex: '0x2386f26fc10000', // 0.01 ETH in hex
        });

        const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.needsFaucet).toBe(false);
        expect(result.current.error).toBeNull();
      });

      it('returns needsFaucet false for Base chain with sufficient balance', async () => {
        const mockToken = createMockToken({ caipChainId: 'eip155:8453' }); // Base

        // User has 0.1 ETH
        mockUseAccountNativeBalance.mockReturnValue({
          balanceWeiInHex: '0x16345785d8a0000', // 0.1 ETH in hex
        });

        const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.needsFaucet).toBe(false);
      });
    });

    describe('when user has insufficient balance for gas', () => {
      it('returns needsFaucet true when balance is less than estimated gas', async () => {
        const mockToken = createMockToken({ caipChainId: 'eip155:59144' }); // Linea

        // User has very low balance (1000 wei)
        mockUseAccountNativeBalance.mockReturnValue({
          balanceWeiInHex: '0x3e8', // 1000 wei
        });

        const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.needsFaucet).toBe(true);
      });

      it('returns needsFaucet true when balance is zero', async () => {
        const mockToken = createMockToken({ caipChainId: 'eip155:59144' }); // Linea

        mockUseAccountNativeBalance.mockReturnValue({
          balanceWeiInHex: '0x0',
        });

        const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.needsFaucet).toBe(true);
      });
    });

    describe('gas estimation', () => {
      it('handles FEE_MARKET gas estimate type', async () => {
        const mockToken = createMockToken({ caipChainId: 'eip155:59144' });

        (
          Engine.context.GasFeeController.fetchGasFeeEstimates as jest.Mock
        ).mockResolvedValue({
          gasEstimateType: GAS_ESTIMATE_TYPES.FEE_MARKET,
          gasFeeEstimates: {
            high: {
              suggestedMaxFeePerGas: '50', // 50 Gwei
            },
          },
        });

        // Set a balance that would be sufficient for lower gas but not 50 Gwei
        mockUseAccountNativeBalance.mockReturnValue({
          balanceWeiInHex: '0x2386f26fc10000', // 0.01 ETH
        });

        const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(
          Engine.context.GasFeeController.fetchGasFeeEstimates,
        ).toHaveBeenCalled();
      });

      it('handles LEGACY gas estimate type', async () => {
        const mockToken = createMockToken({ caipChainId: 'eip155:59144' });

        (
          Engine.context.GasFeeController.fetchGasFeeEstimates as jest.Mock
        ).mockResolvedValue({
          gasEstimateType: GAS_ESTIMATE_TYPES.LEGACY,
          gasFeeEstimates: {
            high: '30', // 30 Gwei
          },
        });

        mockUseAccountNativeBalance.mockReturnValue({
          balanceWeiInHex: '0x2386f26fc10000', // 0.01 ETH
        });

        const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.needsFaucet).toBe(false);
      });

      it('handles ETH_GASPRICE gas estimate type', async () => {
        const mockToken = createMockToken({ caipChainId: 'eip155:59144' });

        (
          Engine.context.GasFeeController.fetchGasFeeEstimates as jest.Mock
        ).mockResolvedValue({
          gasEstimateType: GAS_ESTIMATE_TYPES.ETH_GASPRICE,
          gasFeeEstimates: {
            gasPrice: '25', // 25 Gwei
          },
        });

        mockUseAccountNativeBalance.mockReturnValue({
          balanceWeiInHex: '0x2386f26fc10000', // 0.01 ETH
        });

        const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.needsFaucet).toBe(false);
      });

      it('uses fallback gas estimate on error', async () => {
        const mockToken = createMockToken({ caipChainId: 'eip155:59144' });

        (
          Engine.context.GasFeeController.fetchGasFeeEstimates as jest.Mock
        ).mockRejectedValue(new Error('Network error'));

        // Balance lower than fallback estimate
        mockUseAccountNativeBalance.mockReturnValue({
          balanceWeiInHex: '0x3e8', // 1000 wei
        });

        const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // Should still return a result using fallback
        expect(result.current.needsFaucet).toBe(true);
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Solana', () => {
    const SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

    describe('when user has sufficient SOL balance', () => {
      it('returns needsFaucet false when balance exceeds tx fee + rent exemption', async () => {
        const mockToken = createMockToken({ caipChainId: SOLANA_CHAIN_ID });

        // User has 1 SOL (10^9 lamports)
        mockUseLatestBalance.mockReturnValue({
          displayBalance: '1',
          atomicBalance: BigNumber.from('1000000000'), // 1 SOL in lamports
        });

        const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.needsFaucet).toBe(false);
      });

      it('returns needsFaucet false with just enough balance for fees and rent', async () => {
        const mockToken = createMockToken({ caipChainId: SOLANA_CHAIN_ID });

        // User has exactly enough: 5000 lamports (tx fee) + 890000 lamports (rent) = 895000 lamports
        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.000895',
          atomicBalance: BigNumber.from('895000'),
        });

        const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.needsFaucet).toBe(false);
      });
    });

    describe('when user has insufficient SOL balance', () => {
      it('returns needsFaucet true when balance is zero', async () => {
        const mockToken = createMockToken({ caipChainId: SOLANA_CHAIN_ID });

        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0',
          atomicBalance: BigNumber.from('0'),
        });

        const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.needsFaucet).toBe(true);
      });

      it('returns needsFaucet true when balance is less than rent exemption', async () => {
        const mockToken = createMockToken({ caipChainId: SOLANA_CHAIN_ID });

        // User has only 1000 lamports (less than rent exemption)
        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.000001',
          atomicBalance: BigNumber.from('1000'),
        });

        const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.needsFaucet).toBe(true);
      });

      it('returns needsFaucet true when balance cannot be retrieved', async () => {
        const mockToken = createMockToken({ caipChainId: SOLANA_CHAIN_ID });

        mockUseLatestBalance.mockReturnValue(undefined);

        const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // Should assume needs faucet when balance unavailable
        expect(result.current.needsFaucet).toBe(true);
      });
    });

    describe('rent exemption handling', () => {
      it('uses minSolBalance selector for rent exemption calculation', async () => {
        const mockToken = createMockToken({ caipChainId: SOLANA_CHAIN_ID });

        // Set higher rent exemption
        mockUseSelector.mockImplementation((selector) => {
          if (selector.toString().includes('AccountFormattedAddress')) {
            return '0xUserAddress123';
          }
          return '0.002'; // Higher rent exemption
        });

        // User has enough for tx fee but not for higher rent
        mockUseLatestBalance.mockReturnValue({
          displayBalance: '0.001',
          atomicBalance: BigNumber.from('1000000'), // 0.001 SOL
        });

        const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.needsFaucet).toBe(true);
      });
    });
  });

  describe('refetch functionality', () => {
    it('provides refetch function that re-runs the check', async () => {
      const mockToken = createMockToken({ caipChainId: 'eip155:59144' });

      mockUseAccountNativeBalance.mockReturnValue({
        balanceWeiInHex: '0x0',
      });

      const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.needsFaucet).toBe(true);

      // Update balance
      mockUseAccountNativeBalance.mockReturnValue({
        balanceWeiInHex: '0x2386f26fc10000', // 0.01 ETH
      });

      // Call refetch
      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.needsFaucet).toBe(false);
    });
  });

  describe('token changes', () => {
    it('re-evaluates when token changes from EVM to Solana', async () => {
      const evmToken = createMockToken({ caipChainId: 'eip155:59144' });
      const solanaToken = createMockToken({
        caipChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });

      // EVM has sufficient balance
      mockUseAccountNativeBalance.mockReturnValue({
        balanceWeiInHex: '0x2386f26fc10000',
      });

      // Solana has insufficient balance
      mockUseLatestBalance.mockReturnValue({
        displayBalance: '0',
        atomicBalance: BigNumber.from('0'),
      });

      const { result, rerender } = renderHook(
        ({ token }) => useNeedsGasFaucet(token),
        { initialProps: { token: evmToken } },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.needsFaucet).toBe(false);

      // Switch to Solana token
      rerender({ token: solanaToken });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.needsFaucet).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns error null on successful check', async () => {
      const mockToken = createMockToken({ caipChainId: 'eip155:59144' });

      mockUseAccountNativeBalance.mockReturnValue({
        balanceWeiInHex: '0x2386f26fc10000',
      });

      const { result } = renderHook(() => useNeedsGasFaucet(mockToken));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });
  });
});
