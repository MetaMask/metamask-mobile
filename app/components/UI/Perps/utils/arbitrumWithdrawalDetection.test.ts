import {
  parseUSDCTransferAmount,
  parseERC20TransferRecipient,
  isUSDCContractInteraction,
  isHyperLiquidBridgeTransaction,
  detectHyperLiquidWithdrawal,
  getBridgeContractAddress,
  getUSDCContractAddress,
  ARBITRUM_MAINNET_CHAIN_ID,
  ARBITRUM_TESTNET_CHAIN_ID,
  HYPERLIQUID_BRIDGE_CONTRACTS,
  USDC_CONTRACTS,
  ERC20_TRANSFER_METHOD,
} from './arbitrumWithdrawalDetection';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;

describe('arbitrumWithdrawalDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseUSDCTransferAmount', () => {
    it('returns null for empty or invalid input', () => {
      expect(parseUSDCTransferAmount('')).toBeNull();
      expect(parseUSDCTransferAmount('0x')).toBeNull();
      expect(parseUSDCTransferAmount('invalid')).toBeNull();
    });

    it('returns null for non-transfer method', () => {
      const nonTransferData = '0x1234567890abcdef';
      expect(parseUSDCTransferAmount(nonTransferData)).toBeNull();
    });

    it('returns null for invalid data length', () => {
      const invalidLengthData = '0xa9059cbb1234567890abcdef';
      expect(parseUSDCTransferAmount(invalidLengthData)).toBeNull();
    });

    it('parses USDC transfer amount correctly', () => {
      // Transfer 100 USDC (100 * 1e6 = 100000000)
      const transferData =
        '0xa9059cbb00000000000000000000000012345678901234567890123456789012345678900000000000000000000000000000000000000000000000000000000005f5e100'; // 100 USDC in wei

      const result = parseUSDCTransferAmount(transferData);
      expect(result).toBe('100');
    });

    it('parses small USDC amounts correctly', () => {
      // Transfer 0.5 USDC (0.5 * 1e6 = 500000)
      const transferData =
        '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000000000000007a120'; // 0.5 USDC in wei

      const result = parseUSDCTransferAmount(transferData);
      expect(result).toBe('0.5');
    });

    it('handles parsing errors gracefully', () => {
      const invalidData = '0xa9059cbbinvalid_hex_data';

      const result = parseUSDCTransferAmount(invalidData);

      expect(result).toBeNull();
      // The function doesn't log errors for invalid hex data, it just returns null
      expect(mockDevLogger.log).not.toHaveBeenCalled();
    });
  });

  describe('parseERC20TransferRecipient', () => {
    it('returns null for empty or invalid input', () => {
      expect(parseERC20TransferRecipient('')).toBeNull();
      expect(parseERC20TransferRecipient('0x')).toBeNull();
      expect(parseERC20TransferRecipient('invalid')).toBeNull();
    });

    it('returns null for non-transfer method', () => {
      const nonTransferData = '0x1234567890abcdef';
      expect(parseERC20TransferRecipient(nonTransferData)).toBeNull();
    });

    it('returns null for invalid data length', () => {
      const invalidLengthData = '0xa9059cbb1234567890abcdef';
      expect(parseERC20TransferRecipient(invalidLengthData)).toBeNull();
    });

    it('parses recipient address correctly', () => {
      const recipientAddress = '0x1234567890123456789012345678901234567890';
      const transferData =
        '0xa9059cbb00000000000000000000000012345678901234567890123456789012345678900000000000000000000000000000000000000000000000000000000005f5e100'; // amount

      const result = parseERC20TransferRecipient(transferData);
      expect(result).toBe(recipientAddress);
    });

    it('handles parsing errors gracefully', () => {
      const invalidData = '0xa9059cbbinvalid_hex_data';

      const result = parseERC20TransferRecipient(invalidData);

      expect(result).toBeNull();
      // The function doesn't log errors for invalid hex data, it just returns null
      expect(mockDevLogger.log).not.toHaveBeenCalled();
    });
  });

  describe('isUSDCContractInteraction', () => {
    it('returns true for mainnet USDC contract', () => {
      const result = isUSDCContractInteraction(
        USDC_CONTRACTS.mainnet,
        ARBITRUM_MAINNET_CHAIN_ID,
      );
      expect(result).toBe(true);
    });

    it('returns true for testnet USDC contract', () => {
      const result = isUSDCContractInteraction(
        USDC_CONTRACTS.testnet,
        ARBITRUM_TESTNET_CHAIN_ID,
      );
      expect(result).toBe(true);
    });

    it('returns false for wrong chain', () => {
      const result = isUSDCContractInteraction(
        USDC_CONTRACTS.mainnet,
        ARBITRUM_TESTNET_CHAIN_ID,
      );
      expect(result).toBe(false);
    });

    it('returns false for different contract', () => {
      const result = isUSDCContractInteraction(
        '0x1234567890123456789012345678901234567890',
        ARBITRUM_MAINNET_CHAIN_ID,
      );
      expect(result).toBe(false);
    });

    it('handles case insensitive comparison', () => {
      const result = isUSDCContractInteraction(
        USDC_CONTRACTS.mainnet.toUpperCase(),
        ARBITRUM_MAINNET_CHAIN_ID,
      );
      expect(result).toBe(true);
    });

    it('handles undefined txTo', () => {
      const result = isUSDCContractInteraction(
        undefined as unknown as string,
        ARBITRUM_MAINNET_CHAIN_ID,
      );
      expect(result).toBe(false);
    });
  });

  describe('isHyperLiquidBridgeTransaction', () => {
    it('returns true for mainnet bridge contract', () => {
      const result = isHyperLiquidBridgeTransaction(
        HYPERLIQUID_BRIDGE_CONTRACTS.mainnet,
        ARBITRUM_MAINNET_CHAIN_ID,
      );
      expect(result).toBe(true);
    });

    it('returns true for testnet bridge contract', () => {
      const result = isHyperLiquidBridgeTransaction(
        HYPERLIQUID_BRIDGE_CONTRACTS.testnet,
        ARBITRUM_TESTNET_CHAIN_ID,
      );
      expect(result).toBe(true);
    });

    it('returns false for wrong chain', () => {
      const result = isHyperLiquidBridgeTransaction(
        HYPERLIQUID_BRIDGE_CONTRACTS.mainnet,
        ARBITRUM_TESTNET_CHAIN_ID,
      );
      expect(result).toBe(false);
    });

    it('returns false for different contract', () => {
      const result = isHyperLiquidBridgeTransaction(
        '0x1234567890123456789012345678901234567890',
        ARBITRUM_MAINNET_CHAIN_ID,
      );
      expect(result).toBe(false);
    });

    it('handles case insensitive comparison', () => {
      const result = isHyperLiquidBridgeTransaction(
        HYPERLIQUID_BRIDGE_CONTRACTS.mainnet.toUpperCase(),
        ARBITRUM_MAINNET_CHAIN_ID,
      );
      expect(result).toBe(true);
    });

    it('handles undefined txFrom', () => {
      const result = isHyperLiquidBridgeTransaction(
        undefined as unknown as string,
        ARBITRUM_MAINNET_CHAIN_ID,
      );
      expect(result).toBe(false);
    });
  });

  describe('detectHyperLiquidWithdrawal', () => {
    const mockUserAddress = '0x1234567890123456789012345678901234567890';
    const mockChainId = ARBITRUM_MAINNET_CHAIN_ID;
    const mockBridgeContract = HYPERLIQUID_BRIDGE_CONTRACTS.mainnet;

    const createMockTransaction = (overrides = {}) => ({
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      from: mockBridgeContract,
      to: mockUserAddress,
      data: '0xa9059cbb00000000000000000000000012345678901234567890123456789012345678900000000000000000000000000000000000000000000000000000000005f5e100', // 100 USDC
      chainId: mockChainId,
      time: 1640995200000,
      status: 'confirmed',
      blockNumber: '12345',
      ...overrides,
    });

    it('detects valid HyperLiquid withdrawal', () => {
      const tx = createMockTransaction();

      const result = detectHyperLiquidWithdrawal(
        tx,
        mockUserAddress,
        mockChainId,
      );

      expect(result).toEqual({
        id: `arbitrum-withdrawal-${tx.hash}`,
        timestamp: tx.time,
        amount: '100',
        txHash: tx.hash,
        from: tx.from,
        to: tx.to,
        status: 'completed',
        blockNumber: tx.blockNumber,
      });
    });

    it('returns null for wrong chain ID', () => {
      const tx = createMockTransaction({ chainId: ARBITRUM_TESTNET_CHAIN_ID });

      const result = detectHyperLiquidWithdrawal(
        tx,
        mockUserAddress,
        mockChainId,
      );

      expect(result).toBeNull();
    });

    it('returns null for transaction without data', () => {
      const tx = createMockTransaction({ data: undefined });

      const result = detectHyperLiquidWithdrawal(
        tx,
        mockUserAddress,
        mockChainId,
      );

      expect(result).toBeNull();
    });

    it('returns null for transaction with empty data', () => {
      const tx = createMockTransaction({ data: '0x' });

      const result = detectHyperLiquidWithdrawal(
        tx,
        mockUserAddress,
        mockChainId,
      );

      expect(result).toBeNull();
    });

    it('returns null for transaction not from bridge contract', () => {
      const tx = createMockTransaction({
        from: '0x1234567890123456789012345678901234567890',
      });

      const result = detectHyperLiquidWithdrawal(
        tx,
        mockUserAddress,
        mockChainId,
      );

      expect(result).toBeNull();
    });

    it('returns null for transaction not to user address', () => {
      const tx = createMockTransaction({
        to: '0x9876543210987654321098765432109876543210', // Different address
      });

      const result = detectHyperLiquidWithdrawal(
        tx,
        mockUserAddress,
        mockChainId,
      );

      expect(result).toBeNull();
    });

    it('returns null for non-USDC transfer', () => {
      const tx = createMockTransaction({ data: '0x1234567890abcdef' });

      const result = detectHyperLiquidWithdrawal(
        tx,
        mockUserAddress,
        mockChainId,
      );

      expect(result).toBeNull();
    });

    it('maps transaction status correctly', () => {
      const testCases = [
        { status: 'confirmed', expected: 'completed' },
        { status: 'failed', expected: 'failed' },
        { status: 'pending', expected: 'pending' },
        { status: 'unknown', expected: 'pending' },
      ];

      testCases.forEach(({ status, expected }) => {
        const tx = createMockTransaction({ status });
        const result = detectHyperLiquidWithdrawal(
          tx,
          mockUserAddress,
          mockChainId,
        );

        expect(result?.status).toBe(expected);
      });
    });

    it('uses current timestamp when time is missing', () => {
      const tx = createMockTransaction({ time: undefined });
      const beforeCall = Date.now();

      const result = detectHyperLiquidWithdrawal(
        tx,
        mockUserAddress,
        mockChainId,
      );

      const afterCall = Date.now();
      expect(result?.timestamp).toBeGreaterThanOrEqual(beforeCall);
      expect(result?.timestamp).toBeLessThanOrEqual(afterCall);
    });

    it('handles detection errors gracefully', () => {
      // Create a transaction that would cause an error in the detection logic
      const tx = {
        hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        from: mockBridgeContract,
        to: mockUserAddress,
        data: '0xa9059cbbinvalid_hex_data', // This will cause parsing to fail
        chainId: mockChainId,
        time: 1640995200000,
        status: 'confirmed',
        blockNumber: '12345',
      };

      const result = detectHyperLiquidWithdrawal(
        tx,
        mockUserAddress,
        mockChainId,
      );

      expect(result).toBeNull();
      // The function should return null for invalid data without logging errors
      expect(mockDevLogger.log).not.toHaveBeenCalled();
    });
  });

  describe('getBridgeContractAddress', () => {
    it('returns mainnet bridge contract for mainnet chain', () => {
      const result = getBridgeContractAddress(ARBITRUM_MAINNET_CHAIN_ID);
      expect(result).toBe(HYPERLIQUID_BRIDGE_CONTRACTS.mainnet);
    });

    it('returns testnet bridge contract for testnet chain', () => {
      const result = getBridgeContractAddress(ARBITRUM_TESTNET_CHAIN_ID);
      expect(result).toBe(HYPERLIQUID_BRIDGE_CONTRACTS.testnet);
    });

    it('returns testnet bridge contract for unknown chain', () => {
      const result = getBridgeContractAddress('0x123');
      expect(result).toBe(HYPERLIQUID_BRIDGE_CONTRACTS.testnet);
    });
  });

  describe('getUSDCContractAddress', () => {
    it('returns mainnet USDC contract for mainnet chain', () => {
      const result = getUSDCContractAddress(ARBITRUM_MAINNET_CHAIN_ID);
      expect(result).toBe(USDC_CONTRACTS.mainnet);
    });

    it('returns testnet USDC contract for testnet chain', () => {
      const result = getUSDCContractAddress(ARBITRUM_TESTNET_CHAIN_ID);
      expect(result).toBe(USDC_CONTRACTS.testnet);
    });

    it('returns testnet USDC contract for unknown chain', () => {
      const result = getUSDCContractAddress('0x123');
      expect(result).toBe(USDC_CONTRACTS.testnet);
    });
  });

  describe('constants', () => {
    it('exports correct chain IDs', () => {
      expect(ARBITRUM_MAINNET_CHAIN_ID).toBe('0xa4b1');
      expect(ARBITRUM_TESTNET_CHAIN_ID).toBe('0x66eee');
    });

    it('exports correct ERC20 transfer method', () => {
      expect(ERC20_TRANSFER_METHOD).toBe('0xa9059cbb');
    });

    it('exports bridge contracts', () => {
      expect(HYPERLIQUID_BRIDGE_CONTRACTS.mainnet).toBeDefined();
      expect(HYPERLIQUID_BRIDGE_CONTRACTS.testnet).toBeDefined();
    });

    it('exports USDC contracts', () => {
      expect(USDC_CONTRACTS.mainnet).toBeDefined();
      expect(USDC_CONTRACTS.testnet).toBeDefined();
    });
  });
});
