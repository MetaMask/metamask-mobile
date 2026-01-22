import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import { isNonEvmChainId, isSolanaChainId } from '@metamask/bridge-controller';
import { Hex, CaipChainId } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import BN from 'bnjs4';
import Engine from '../../../../core/Engine';
import { useAccountNativeBalance } from '../../../Views/confirmations/hooks/useAccountNativeBalance';
import { selectMinSolBalance } from '../../../../selectors/bridgeController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { decGWEIToHexWEI } from '../../../../util/conversions';
import { hexToBN } from '../../../../util/number';
import { safeFormatChainIdToHex } from '../util/safeFormatChainIdToHex';
import { CardTokenAllowance } from '../types';
import { useLatestBalance } from '../../Bridge/hooks/useLatestBalance';

// Constants for gas estimation
const ERC20_APPROVE_GAS_LIMIT = 65000; // Conservative estimate for ERC20 approve
const GAS_LIMIT_BUFFER = 1.3; // 30% buffer for safety

// Solana constants
const SOLANA_TX_FEE_LAMPORTS = 5000; // Standard Solana transaction fee in lamports
const SOL_DECIMALS = 9;

interface UseNeedsGasFaucetResult {
  needsFaucet: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to determine if the user needs a gas faucet before executing a delegation transaction.
 * Supports both EVM chains (Linea/Base) and Solana.
 *
 * For EVM: Checks if user has enough ETH to cover gas fees for an ERC20 approve transaction
 * For Solana: Checks if user has enough SOL to cover transaction fees + rent exemption
 *
 * @param token - The token being delegated (contains chain information)
 * @returns Object with needsFaucet boolean, loading state, error, and refetch function
 */
export const useNeedsGasFaucet = (
  token?: CardTokenAllowance | null,
): UseNeedsGasFaucetResult => {
  const [needsFaucet, setNeedsFaucet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const minSolBalance = useSelector(selectMinSolBalance);

  // Determine chain type
  const chainInfo = useMemo(() => {
    if (!token?.caipChainId) {
      return { isSolana: false, isEvm: false, chainId: null };
    }

    const isSolana = isSolanaChainId(token.caipChainId);
    const isEvm = !isNonEvmChainId(token.caipChainId);

    return {
      isSolana,
      isEvm,
      chainId: token.caipChainId,
    };
  }, [token?.caipChainId]);

  // Get hex chain ID for EVM chains
  const hexChainId = useMemo(() => {
    if (!chainInfo.isEvm || !token?.caipChainId) return null;
    return safeFormatChainIdToHex(token.caipChainId) as Hex;
  }, [chainInfo.isEvm, token?.caipChainId]);

  // EVM: Get native balance using the confirmations hook
  const { balanceWeiInHex } = useAccountNativeBalance(
    hexChainId ?? ('0x0' as Hex),
    selectedAddress ?? '',
  );

  // Solana: Get native SOL balance using Bridge's useLatestBalance
  // For Solana, we need the native SOL token (address is the native mint)
  const solanaBalance = useLatestBalance({
    address: chainInfo.isSolana ? 'native' : undefined,
    decimals: SOL_DECIMALS,
    chainId: chainInfo.isSolana
      ? (token?.caipChainId as CaipChainId)
      : undefined,
  });

  /**
   * Estimate gas fee for EVM chains
   */
  const estimateEvmGasFee = useCallback(async (): Promise<BN> => {
    try {
      const { GasFeeController } = Engine.context;
      const result = await GasFeeController.fetchGasFeeEstimates();

      const gasLimitWithBuffer = Math.ceil(
        ERC20_APPROVE_GAS_LIMIT * GAS_LIMIT_BUFFER,
      );

      let gasPrice: string;

      // Use 'high' estimate for safety margin
      const estimateRange = 'high';

      switch (result.gasEstimateType) {
        case GAS_ESTIMATE_TYPES.FEE_MARKET:
          gasPrice =
            result.gasFeeEstimates[estimateRange].suggestedMaxFeePerGas;
          break;
        case GAS_ESTIMATE_TYPES.LEGACY:
          gasPrice = result.gasFeeEstimates[estimateRange];
          break;
        default:
          gasPrice = result.gasFeeEstimates.gasPrice;
          break;
      }

      const weiGasPrice = hexToBN(decGWEIToHexWEI(gasPrice));
      return weiGasPrice.muln(gasLimitWithBuffer);
    } catch (err) {
      // Return a conservative fallback estimate if gas estimation fails
      // Assume ~20 Gwei gas price as fallback
      const fallbackGasPrice = new BN('20000000000'); // 20 Gwei in Wei
      const gasLimitWithBuffer = Math.ceil(
        ERC20_APPROVE_GAS_LIMIT * GAS_LIMIT_BUFFER,
      );
      return fallbackGasPrice.muln(gasLimitWithBuffer);
    }
  }, []);

  /**
   * Check if user needs faucet for EVM chains
   */
  const checkEvmFaucet = useCallback(async () => {
    if (!hexChainId || !balanceWeiInHex) {
      // If we can't get balance, assume they might need faucet
      return true;
    }

    try {
      const estimatedGasFee = await estimateEvmGasFee();
      const balanceBN = new BN(balanceWeiInHex.replace('0x', ''), 'hex');

      // User needs faucet if balance is less than estimated gas fee
      return balanceBN.lt(estimatedGasFee);
    } catch (err) {
      console.error('Error checking EVM faucet need:', err);
      // Assume needs faucet on error
      return true;
    }
  }, [hexChainId, balanceWeiInHex, estimateEvmGasFee]);

  /**
   * Check if user needs faucet for Solana
   */
  const checkSolanaFaucet = useCallback(() => {
    if (!solanaBalance?.atomicBalance) {
      // If we can't get balance, assume they might need faucet
      return true;
    }

    try {
      const balance = new BigNumber(solanaBalance.atomicBalance.toString());

      // Calculate minimum required: transaction fee + rent exemption
      const txFee = new BigNumber(SOLANA_TX_FEE_LAMPORTS);

      // Convert minSolBalance from SOL to lamports
      const minSolInLamports = minSolBalance
        ? new BigNumber(minSolBalance).times(
            new BigNumber(10).pow(SOL_DECIMALS),
          )
        : new BigNumber(0);

      const totalRequired = txFee.plus(minSolInLamports);

      // User needs faucet if balance is less than total required
      return balance.lt(totalRequired);
    } catch (err) {
      console.error('Error checking Solana faucet need:', err);
      return true; // Assume needs faucet on error
    }
  }, [solanaBalance?.atomicBalance, minSolBalance]);

  /**
   * Main function to check if faucet is needed
   */
  const checkNeedsFaucet = useCallback(async () => {
    if (!token?.caipChainId) {
      setNeedsFaucet(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let result = false;

      if (chainInfo.isEvm) {
        result = await checkEvmFaucet();
      } else if (chainInfo.isSolana) {
        result = checkSolanaFaucet();
      }

      setNeedsFaucet(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error checking faucet';
      setError(errorMessage);
      // Assume needs faucet on error for safety
      setNeedsFaucet(true);
    } finally {
      setIsLoading(false);
    }
  }, [
    token?.caipChainId,
    chainInfo.isEvm,
    chainInfo.isSolana,
    checkEvmFaucet,
    checkSolanaFaucet,
  ]);

  // Run check when dependencies change
  useEffect(() => {
    checkNeedsFaucet();
  }, [checkNeedsFaucet]);

  // Refetch function for manual refresh
  const refetch = useCallback(() => {
    checkNeedsFaucet();
  }, [checkNeedsFaucet]);

  return {
    needsFaucet,
    isLoading,
    error,
    refetch,
  };
};

export default useNeedsGasFaucet;
