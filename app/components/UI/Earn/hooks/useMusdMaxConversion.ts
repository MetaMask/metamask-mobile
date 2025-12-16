import { Hex } from '@metamask/utils';
import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { generateTransferData } from '../../../../util/transactions';
import { MMM_ORIGIN } from '../../../Views/confirmations/constants/confirmations';
import { EVM_SCOPE } from '../constants/networks';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import {
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
} from '../constants/musd';
import { AssetType } from '../../../Views/confirmations/types/token';

/**
 * Result from creating a max conversion transaction.
 */
export interface MaxConversionResult {
  /** The transaction ID created */
  transactionId: string;
  /** The output chain ID where mUSD will be received */
  outputChainId: Hex;
}

/**
 * Determines the output chain ID for mUSD conversion.
 * Uses same-chain if mUSD is deployed there, otherwise defaults to Ethereum mainnet.
 */
const getOutputChainId = (paymentTokenChainId: Hex): Hex => {
  const mUsdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[paymentTokenChainId];
  if (mUsdAddress) {
    // mUSD exists on this chain - same-chain conversion
    return paymentTokenChainId;
  }
  // mUSD not on this chain - cross-chain to Ethereum mainnet
  return MUSD_CONVERSION_DEFAULT_CHAIN_ID as Hex;
};

/**
 * Hook for creating max-amount mUSD conversion transactions.
 *
 * **EVM-Only**: This hook only supports EVM-compatible chains.
 *
 * This hook creates a transaction with the user's full token balance and sets
 * the payment token to trigger automatic Relay quote fetching. It does NOT
 * navigate - the caller (e.g., MusdMaxConvertSheet) handles the UI.
 *
 * The TransactionPayController will automatically fetch Relay quotes when:
 * 1. The transaction is added
 * 2. The payment token is set via updatePaymentToken
 *
 * @example
 * const { createMaxConversion, isLoading, error } = useMusdMaxConversion();
 *
 * const result = await createMaxConversion(token); // token is AssetType
 *
 * // result.transactionId can be used to read quotes from selectors
 */
export const useMusdMaxConversion = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const selectedAddress = selectedAccount?.address;

  /**
   * Creates a max-amount mUSD conversion transaction and sets the payment token.
   * Returns the transaction ID for the caller to use with selectors.
   */
  // TODO: Decide later if we want navigation to the MusdMaxConvertSheet here or in the caller.
  const createMaxConversion = useCallback(
    async (token: AssetType): Promise<MaxConversionResult> => {
      // TODO: Double-check if assertions are necessary here.
      const tokenAddress = token.address as Hex;
      const tokenChainId = token.chainId as Hex;
      try {
        setIsLoading(true);
        setError(null);

        if (!selectedAddress) {
          throw new Error('No account selected');
        }

        if (!tokenAddress || !tokenChainId) {
          throw new Error('Token address and chainId are required');
        }

        if (!token.rawBalance || token.rawBalance === '0x0') {
          throw new Error('Token balance must be greater than zero');
        }

        const {
          NetworkController,
          TransactionController,
          TransactionPayController,
        } = Engine.context;

        // Determine output chain (same-chain if mUSD exists, else mainnet)
        const outputChainId = getOutputChainId(tokenChainId);

        const networkClientId =
          NetworkController.findNetworkClientIdByChainId(outputChainId);

        if (!networkClientId) {
          throw new Error(
            `Network client not found for chain ID: ${outputChainId}`,
          );
        }

        const mUSDTokenAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[outputChainId];

        if (!mUSDTokenAddress) {
          throw new Error(
            `mUSD token address not found for chain ID: ${outputChainId}`,
          );
        }

        // Generate transfer data with max amount
        // Note: We use the token's rawBalance which is already in minimal units (hex)
        const transferData = generateTransferData('transfer', {
          toAddress: selectedAddress,
          amount: token.rawBalance,
        });

        // Create transaction with ALL required options for Relay to work
        const { transactionMeta } = await TransactionController.addTransaction(
          {
            to: mUSDTokenAddress,
            from: selectedAddress,
            data: transferData,
            value: '0x0',
            chainId: outputChainId,
          },
          {
            // Skip initial gas estimate for better UX - it will be calculated async
            skipInitialGasEstimate: true,
            networkClientId,
            origin: MMM_ORIGIN,
            type: TransactionType.musdConversion,
            // CRITICAL: nestedTransactions is required for Relay to work
            // TODO: This won't be needed in the near future once the following PR is merged: https://github.com/MetaMask/metamask-mobile/pull/23704
            nestedTransactions: [
              {
                to: mUSDTokenAddress,
                data: transferData as Hex,
                value: '0x0',
              },
            ],
          },
        );

        // Set payment token - this triggers automatic Relay quote fetching
        TransactionPayController.updatePaymentToken({
          transactionId: transactionMeta.id,
          tokenAddress,
          chainId: tokenChainId,
        });

        Logger.log(
          `[mUSD Max Conversion] Created transaction ${transactionMeta.id} for ${token.symbol ?? tokenAddress}`,
        );

        return {
          transactionId: transactionMeta.id,
          outputChainId,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to create max conversion transaction';

        Logger.error(
          err as Error,
          '[mUSD Max Conversion] Failed to create max conversion',
        );

        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [selectedAddress],
  );

  /**
   * Resets the error state.
   */
  // TODO: Double-check that this is needed.
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createMaxConversion,
    isLoading,
    error,
    clearError,
  };
};
