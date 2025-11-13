import { Hex, isHexString } from '@metamask/utils';
import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { generateTransferData } from '../../../../util/transactions';
import {
  MUSD_ADDRESS_ETHEREUM,
  USDC_ADDRESS_ETHEREUM,
  ETHEREUM_MAINNET_CHAIN_ID,
} from '../constants/musd';

// TODO: Add comprehensive tests following Earn team patterns (mock Engine.context, selectors, test success/error cases, loading states)

export interface MusdConversionPaymentToken {
  address: Hex;
}

const DEFAULT_PAYMENT_TOKEN: MusdConversionPaymentToken = {
  address: USDC_ADDRESS_ETHEREUM as Hex,
};

/**
 * Hook for initiating mUSD conversion flow using MetaMask Pay (TransactionPayController) with Relay integration.
 *
 * This hook:
 * 1. Creates a placeholder mUSD transfer transaction with amount = 0
 * 2. Pre-selects a payment token (USDC by default, or custom token if provided)
 * 3. Fetches gas fee estimates for the payment token's network
 * 4. Returns transaction ID for navigation to confirmation screen
 * 5. User inputs amount and selects payment stablecoin on confirmation screen
 * 6. TransactionPayController automatically fetches quotes and handles the flow
 *
 * @returns Object containing:
 * - initiateConversion: Async function to start the conversion flow
 * - isLoading: Boolean indicating if conversion is in progress
 * - error: Error message string if conversion failed, null otherwise
 * - transactionId: Transaction ID for tracking, null if not yet created
 *
 * @example
 * // Use default USDC payment token
 * const { initiateConversion } = useMusdConversion();
 *
 * const handleConvert = async () => {
 *   try {
 *     await initiateConversion({
 *       address: USDC_ADDRESS_ETHEREUM,
 *       chainId: ETHEREUM_MAINNET_CHAIN_ID,
 *     });
 *     // Navigate to confirmation screen
 *     navigation.navigate(Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS);
 *   } catch (err) {
 *     // Handle error
 *   }
 * };
 */
export const useMusdConversion = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  // Temp: Hardcoding payment token to be on Ethereum mainnet for now.
  // We can remove this restriction later to support other networks.
  const initiateConversion = useCallback(
    async (
      paymentToken: MusdConversionPaymentToken = DEFAULT_PAYMENT_TOKEN,
    ): Promise<string> => {
      try {
        setIsLoading(true);
        setError(null);
        setTransactionId(null);

        if (!isHexString(paymentToken.address)) {
          throw new Error('Payment token address is not a valid hex address');
        }

        if (!selectedAddress) {
          throw new Error('No account selected');
        }

        Logger.log('[mUSD Conversion] Selected address:', selectedAddress);

        const { NetworkController } = Engine.context;
        const networkClientId = NetworkController.findNetworkClientIdByChainId(
          ETHEREUM_MAINNET_CHAIN_ID as Hex,
        );

        if (!networkClientId) {
          throw new Error('Network client not found for Ethereum mainnet');
        }

        Logger.log('[mUSD Conversion] Network client ID:', networkClientId);

        // Create minimal transfer data with amount = 0
        // The actual amount will be set by the user on the confirmation screen
        const transferData = generateTransferData('transfer', {
          toAddress: selectedAddress as Hex, // Transfer to self
          amount: '0x0', // Placeholder amount
        });

        Logger.log('[mUSD Conversion] Generated transfer data:', transferData);

        const { TransactionController } = Engine.context;

        // This will show the confirmation screen where user inputs amount and selects payment token
        const { transactionMeta } = await TransactionController.addTransaction(
          {
            to: MUSD_ADDRESS_ETHEREUM as Hex,
            from: selectedAddress as Hex,
            data: transferData,
            value: '0x0',
            chainId: ETHEREUM_MAINNET_CHAIN_ID as Hex,
          },
          {
            networkClientId,
            origin: 'metamask',
            // TODO: Add type for musdConversion to TransactionType.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            type: 'musdConversion' as any,
            // Nested transaction is required for Relay to work. This will be fixed in a future iteration.
            nestedTransactions: [
              {
                to: MUSD_ADDRESS_ETHEREUM as Hex,
                // from: selectedAddress as Hex,
                data: transferData as `0x${string}`,
                value: '0x0',
                // chainId: ETHEREUM_MAINNET_CHAIN_ID as Hex,
              },
            ],
          },
        );

        const newTransactionId = transactionMeta.id;
        Logger.log('[mUSD Conversion] Transaction created:', newTransactionId);

        // Update state with transaction ID
        setTransactionId(newTransactionId);
        setIsLoading(false);

        return newTransactionId;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to create mUSD conversion transaction';

        Logger.error(
          err as Error,
          '[mUSD Conversion] Failed to create conversion transaction',
        );

        setError(errorMessage);
        setIsLoading(false);
        throw err;
      }
    },
    [selectedAddress],
  );

  return {
    initiateConversion,
    isLoading,
    error,
    transactionId,
  };
};
