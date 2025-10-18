import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

// Arbitrum chain IDs
export const ARBITRUM_MAINNET_CHAIN_ID = '0xa4b1'; // 42161
export const ARBITRUM_TESTNET_CHAIN_ID = '0x66eed'; // 421614

// HyperLiquid bridge contracts (from hyperLiquidConfig.ts)
export const HYPERLIQUID_BRIDGE_CONTRACTS = {
  mainnet: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7', // HyperLiquid Arbitrum mainnet bridge
  testnet: '0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89', // HyperLiquid Arbitrum testnet bridge
};

// USDC contract addresses on Arbitrum
export const USDC_CONTRACTS = {
  mainnet: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum USDC
  testnet: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Goerli USDC
};

// ERC20 Transfer method signature
export const ERC20_TRANSFER_METHOD = '0xa9059cbb'; // transfer(address,uint256)

/**
 * Parse USDC transfer amount from transaction data
 *
 * ERC20 transfer method: transfer(address,uint256)
 * Data format: 0xa9059cbb + 32-byte address + 32-byte amount
 *
 * @param txData - Transaction data hex string
 * @returns Amount in USDC (with 6 decimals) or null if not a transfer
 */
export const parseUSDCTransferAmount = (txData: string): string | null => {
  try {
    if (!txData || txData === '0x') {
      return null;
    }

    // Check if it's a transfer method
    const methodId = txData.slice(0, 10);
    if (methodId !== ERC20_TRANSFER_METHOD) {
      return null;
    }

    // Extract amount from data (position 74-138, 32 bytes)
    const amountHex = txData.slice(74, 138);
    if (amountHex.length !== 64) {
      return null;
    }

    // Convert hex to BigNumber and divide by USDC decimals (6)
    const amountWei = BigInt('0x' + amountHex);
    const amount = Number(amountWei) / 1e6; // USDC has 6 decimals

    return amount.toString();
  } catch (error) {
    DevLogger.log('Error parsing USDC transfer amount:', error);
    return null;
  }
};

/**
 * Parse recipient address from ERC20 transfer transaction data
 *
 * @param txData - Transaction data hex string
 * @returns Recipient address or null if not a transfer
 */
export const parseERC20TransferRecipient = (txData: string): string | null => {
  try {
    if (!txData || txData === '0x') {
      return null;
    }

    // Check if it's a transfer method
    const methodId = txData.slice(0, 10);
    if (methodId !== ERC20_TRANSFER_METHOD) {
      return null;
    }

    // Extract recipient address from data (position 10-74, 32 bytes)
    const addressHex = txData.slice(10, 74);
    if (addressHex.length !== 64) {
      return null;
    }

    // Convert to address format (remove leading zeros)
    const address = '0x' + addressHex.slice(24); // Last 20 bytes

    return address;
  } catch (error) {
    DevLogger.log('Error parsing ERC20 transfer recipient:', error);
    return null;
  }
};

/**
 * Check if a transaction is interacting with USDC contract
 *
 * @param txTo - Transaction 'to' address
 * @param chainId - Current chain ID
 * @returns True if transaction is with USDC contract
 */
export const isUSDCContractInteraction = (
  txTo: string,
  chainId: string,
): boolean => {
  const usdcContract =
    chainId === ARBITRUM_MAINNET_CHAIN_ID
      ? USDC_CONTRACTS.mainnet
      : USDC_CONTRACTS.testnet;

  return txTo?.toLowerCase() === usdcContract.toLowerCase();
};

/**
 * Check if a transaction is from HyperLiquid bridge contract
 *
 * @param txFrom - Transaction 'from' address
 * @param chainId - Current chain ID
 * @returns True if transaction is from HyperLiquid bridge
 */
export const isHyperLiquidBridgeTransaction = (
  txFrom: string,
  chainId: string,
): boolean => {
  const bridgeContract =
    chainId === ARBITRUM_MAINNET_CHAIN_ID
      ? HYPERLIQUID_BRIDGE_CONTRACTS.mainnet
      : HYPERLIQUID_BRIDGE_CONTRACTS.testnet;

  return txFrom?.toLowerCase() === bridgeContract.toLowerCase();
};

/**
 * Detect if a transaction is a HyperLiquid withdrawal
 *
 * @param tx - Transaction metadata
 * @param userAddress - User's wallet address
 * @param chainId - Current chain ID
 * @returns Withdrawal data or null if not a withdrawal
 */
export const detectHyperLiquidWithdrawal = (
  tx: {
    hash: string;
    from?: string;
    to?: string;
    data?: string;
    chainId?: string;
    time?: number;
    status?: string;
    blockNumber?: string;
  },
  userAddress: string,
  chainId: string,
): {
  id: string;
  timestamp: number;
  amount: string;
  txHash: string;
  from: string;
  to: string;
  status: 'completed' | 'failed' | 'pending';
  blockNumber?: string;
} | null => {
  try {
    // Must be on Arbitrum
    if (tx.chainId !== chainId) {
      return null;
    }

    // Must be a contract interaction (has data)
    if (!tx.data || tx.data === '0x') {
      return null;
    }

    // Must be from HyperLiquid bridge contract
    if (!isHyperLiquidBridgeTransaction(tx.from || '', chainId)) {
      return null;
    }

    // Must be to the current user's address
    if (tx.to?.toLowerCase() !== userAddress.toLowerCase()) {
      return null;
    }

    // Must be a USDC transfer
    const amount = parseUSDCTransferAmount(tx.data);
    if (!amount) {
      return null;
    }

    // Create withdrawal record
    return {
      id: `arbitrum-withdrawal-${tx.hash}`,
      timestamp: tx.time || Date.now(),
      amount,
      txHash: tx.hash,
      from: tx.from || '',
      to: tx.to || '',
      status:
        tx.status === 'confirmed'
          ? 'completed'
          : tx.status === 'failed'
          ? 'failed'
          : 'pending',
      blockNumber: tx.blockNumber,
    };
  } catch (error) {
    DevLogger.log('Error detecting HyperLiquid withdrawal:', error);
    return null;
  }
};

/**
 * Get the appropriate bridge contract address for the current network
 *
 * @param chainId - Current chain ID
 * @returns Bridge contract address
 */
export const getBridgeContractAddress = (chainId: string): string => {
  return chainId === ARBITRUM_MAINNET_CHAIN_ID
    ? HYPERLIQUID_BRIDGE_CONTRACTS.mainnet
    : HYPERLIQUID_BRIDGE_CONTRACTS.testnet;
};

/**
 * Get the appropriate USDC contract address for the current network
 *
 * @param chainId - Current chain ID
 * @returns USDC contract address
 */
export const getUSDCContractAddress = (chainId: string): string => {
  return chainId === ARBITRUM_MAINNET_CHAIN_ID
    ? USDC_CONTRACTS.mainnet
    : USDC_CONTRACTS.testnet;
};
