import { Hex } from '@metamask/utils';
import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { TransactionType } from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { generateTransferData } from '../../../../util/transactions';
import { MMM_ORIGIN } from '../../../Views/confirmations/constants/confirmations';
import Routes from '../../../../constants/navigation/Routes';
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
// TODO: Use the useMusdConversionTokens hook to get the output chain ID instead of duplicating it here.
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
 * This hook handles transaction creation and navigation:
 * 1. Creates the transaction first (ensures approvalRequest exists)
 * 2. Sets the payment token to trigger automatic Relay quote fetching
 * 3. Navigates to the confirmation modal after transaction is ready
 *
 * The TransactionPayController will automatically fetch Relay quotes when:
 * 1. The transaction is added
 * 2. The payment token is set via updatePaymentToken
 *
 * @example
 * const { createMaxConversion, isLoading, error } = useMusdMaxConversion();
 *
 * await createMaxConversion(token); // Creates transaction then navigates
 */
// TODO: Consider combining this hook with useMusdConversion.
export const useMusdMaxConversion = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const selectedAddress = selectedAccount?.address;

  /**
   * Creates a max-amount mUSD conversion transaction and navigates to the confirmation screen.
   * Transaction is created first to ensure approvalRequest exists when the modal renders.
   */
  const createMaxConversion = useCallback(
    async (token: AssetType): Promise<MaxConversionResult> => {
      // TODO: Double-check if assertions are necessary here.
      const tokenAddress = token.address as Hex;
      const tokenChainId = token.chainId as Hex;

      // TODO: Consider using the useMusdConversionTokens hook to get the output chain ID instead of duplicating it here.
      // Determine output chain (same-chain if mUSD exists, else mainnet)
      const outputChainId = getOutputChainId(tokenChainId);

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
          },
        );

        // Set payment token - this triggers automatic Relay quote fetching
        Logger.log('[mUSD Max Conversion] Setting payment token:', {
          transactionId: transactionMeta.id,
          tokenAddress,
          chainId: tokenChainId,
        });

        TransactionPayController.updatePaymentToken({
          transactionId: transactionMeta.id,
          tokenAddress,
          chainId: tokenChainId,
        });

        Logger.log(
          `[mUSD Max Conversion] Created transaction ${transactionMeta.id} for ${token.symbol ?? tokenAddress}`,
        );

        // Navigate to modal stack AFTER transaction is created
        // This ensures approvalRequest exists when the confirmation screen renders
        navigation.navigate(Routes.EARN.MODALS.ROOT, {
          screen: Routes.EARN.MODALS.MUSD_MAX_CONVERSION,
          params: {
            // maxValueMode required to display mUSD max conversion bottom sheet confirmation.
            maxValueMode: true,
            outputChainId,
            token,
          },
        });

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
    [navigation, selectedAddress],
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
