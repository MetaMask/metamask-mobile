import { Hex, isHexString } from '@metamask/utils';
import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { generateTransferData } from '../../../../util/transactions';
import { MMM_ORIGIN } from '../../../Views/confirmations/constants/confirmations';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { EVM_SCOPE } from '../constants/networks';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { TransactionType } from '@metamask/transaction-controller';

/**
 * Type guard to validate allowedPaymentTokens structure.
 * Checks if the value is a valid Record<Hex, Hex[]> mapping.
 * Validates that both keys (chain IDs) and values (token addresses) are hex strings.
 *
 * @param value - Value to validate
 * @returns true if valid, false otherwise
 */
export const areValidAllowedPaymentTokens = (
  value: unknown,
): value is Record<Hex, Hex[]> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([key, val]) =>
      isHexString(key) &&
      Array.isArray(val) &&
      val.every((addr) => isHexString(addr)),
  );
};

/**
 * Configuration for mUSD conversion
 */
export interface MusdConversionConfig {
  /**
   * The mUSD token to convert to
   */
  outputToken: {
    address: Hex;
    chainId: Hex;
    symbol: string;
    name: string;
    decimals: number;
  };
  /**
   * The payment token to prefill in the confirmation screen
   */
  preferredPaymentToken: {
    address: Hex;
    chainId: Hex;
  };
  /**
   * Optional allowlist of payment tokens that can be used to pay for the conversion, organized by chain ID.
   * Maps chain IDs to arrays of allowed token addresses.
   * If not provided, all tokens will be available for selection.
   */
  allowedPaymentTokens?: Record<Hex, Hex[]>;
  /**
   * Optional navigation stack to use (defaults to Routes.EARN.ROOT)
   */
  navigationStack?: string;
}

/**
 * Hook for initiating mUSD conversion flow using MetaMask Pay.
 *
 * **EVM-Only**: This hook only supports EVM-compatible chains. It uses ERC-20
 * transfer encoding and MetaMask Pay's Relay integration, which are specific to
 * EVM networks. For non-EVM chains (Bitcoin, Solana, Tron), use alternative flows.
 *
 * This hook handles both transaction creation and navigation to the confirmation screen.
 *
 * @example
 * const { initiateConversion } = useMusdConversion();
 *
 * await initiateConversion({
 *   outputToken: {
 *     address: MUSD_ADDRESS_ETHEREUM,
 *     chainId: ETHEREUM_MAINNET_CHAIN_ID,
 *     symbol: 'mUSD',
 *     name: 'mUSD',
 *     decimals: 6,
 *   },
 *   preferredPaymentToken: {
 *     address: USDC_ADDRESS_ARBITRUM,
 *     chainId: NETWORKS_CHAIN_ID.ARBITRUM,
 *   },
 * });
 */
export const useMusdConversion = () => {
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );

  const selectedAddress = selectedAccount?.address;

  /**
   * Creates a placeholder transaction and navigating to confirmation.
   * Navigation happens immediately, then transaction creation happens in background.
   */
  const initiateConversion = useCallback(
    async (config: MusdConversionConfig): Promise<string> => {
      const {
        outputToken,
        preferredPaymentToken,
        navigationStack = Routes.EARN.ROOT,
      } = config;

      try {
        setError(null);

        if (!outputToken || !preferredPaymentToken) {
          throw new Error(
            'Output token and preferred payment token are required',
          );
        }

        if (!selectedAddress) {
          throw new Error('No account selected');
        }

        const { NetworkController } = Engine.context;
        const networkClientId = NetworkController.findNetworkClientIdByChainId(
          outputToken.chainId,
        );

        if (!networkClientId) {
          throw new Error(
            `Network client not found for chain ID: ${outputToken.chainId}`,
          );
        }

        /**
         * Navigate to the confirmation screen immediately for better UX,
         * since there can be a delay between the user's button press and
         * transaction creation in the background.
         */
        navigation.navigate(navigationStack, {
          screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          params: {
            loader: ConfirmationLoader.CustomAmount,
            preferredPaymentToken,
            outputToken: {
              address: outputToken.address,
              chainId: outputToken.chainId,
              symbol: outputToken.symbol,
              name: outputToken.name,
              decimals: outputToken.decimals,
            },
            allowedPaymentTokens: config.allowedPaymentTokens,
          },
        });

        const ZERO_HEX_VALUE = '0x0';

        /**
         * Create minimal transfer data with amount = 0
         * The actual amount will be set by the user on the confirmation screen
         */
        const transferData = generateTransferData('transfer', {
          toAddress: selectedAddress,
          amount: ZERO_HEX_VALUE,
        });

        const { TransactionController } = Engine.context;

        const { transactionMeta } = await TransactionController.addTransaction(
          {
            to: outputToken.address,
            from: selectedAddress,
            data: transferData,
            value: ZERO_HEX_VALUE,
            chainId: outputToken.chainId,
          },
          {
            /**
             * Calculate gas estimate asynchronously.
             * Enabling this reduces our first paint time on the mUSD conversion screen by ~500ms.
             */
            skipInitialGasEstimate: true,
            networkClientId,
            origin: MMM_ORIGIN,
            type: TransactionType.musdConversion,
            // Important: Nested transaction is required for Relay to work. This will be fixed in a future iteration.
            nestedTransactions: [
              {
                to: outputToken.address,
                data: transferData as Hex,
                value: ZERO_HEX_VALUE,
              },
            ],
          },
        );

        const newTransactionId = transactionMeta.id;

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

        // Prevent user from being stuck on confirmation screen without a transaction.
        navigation.goBack();

        throw err;
      }
    },
    [navigation, selectedAddress],
  );

  return {
    initiateConversion,
    error,
  };
};
