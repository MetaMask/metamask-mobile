import { Hex } from '@metamask/utils';
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
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import { selectMusdConversionEducationSeen } from '../../../../reducers/user';

/**
 * Configuration for mUSD conversion
 */
export interface MusdConversionConfig {
  /**
   * The chain ID of the mUSD token to convert to.
   */
  outputChainId: Hex;
  /**
   * The payment token to prefill in the confirmation screen
   */
  preferredPaymentToken: {
    address: Hex;
    chainId: Hex;
  };
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
 * EVM networks.
 *
 * This hook handles both transaction creation and navigation to the confirmation screen.
 *
 * @example
 * const { initiateConversion } = useMusdConversion();
 *
 * await initiateConversion({
 *   outputChainId: CHAIN_IDS.MAINNET,
 *   preferredPaymentToken: {
 *     address: USDC_ADDRESS_MAINNET,
 *     chainId: CHAIN_IDS.MAINNET,
 *   },
 *   navigationStack: Routes.EARN.ROOT,
 * });
 */
export const useMusdConversion = () => {
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );

  const selectedAddress = selectedAccount?.address;

  const hasSeenMusdEducationScreen = useSelector(
    selectMusdConversionEducationSeen,
  );

  const navigateToConversionScreen = useCallback(
    ({
      outputChainId,
      preferredPaymentToken,
      navigationStack = Routes.EARN.ROOT,
    }: MusdConversionConfig) => {
      navigation.navigate(navigationStack, {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        params: {
          loader: ConfirmationLoader.CustomAmount,
          preferredPaymentToken,
          outputChainId,
        },
      });
    },
    [navigation],
  );

  /**
   * Creates a placeholder transaction and navigates to confirmation.
   * Navigation happens immediately. Transaction creation and gas estimation happen asynchronously.
   */
  const initiateConversion = useCallback(
    async (config: MusdConversionConfig): Promise<string> => {
      const { outputChainId, preferredPaymentToken } = config;

      try {
        setError(null);

        if (!outputChainId || !preferredPaymentToken) {
          throw new Error(
            'Output chain ID and preferred payment token are required',
          );
        }

        if (!selectedAddress) {
          throw new Error('No account selected');
        }

        const { NetworkController } = Engine.context;
        const networkClientId =
          NetworkController.findNetworkClientIdByChainId(outputChainId);

        if (!networkClientId) {
          throw new Error(
            `Network client not found for chain ID: ${outputChainId}`,
          );
        }

        /**
         * Navigate to the confirmation screen immediately for better UX,
         * since there can be a delay between the user's button press and
         * transaction creation in the background.
         */
        navigateToConversionScreen(config);

        try {
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

          const mUSDTokenAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[outputChainId];

          if (!mUSDTokenAddress) {
            throw new Error(
              `mUSD token address not found for chain ID: ${outputChainId}`,
            );
          }

          const { transactionMeta } =
            await TransactionController.addTransaction(
              {
                to: mUSDTokenAddress,
                from: selectedAddress,
                data: transferData,
                value: ZERO_HEX_VALUE,
                chainId: outputChainId,
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
                    to: mUSDTokenAddress,
                    data: transferData as Hex,
                    value: ZERO_HEX_VALUE,
                  },
                ],
              },
            );

          const newTransactionId = transactionMeta.id;

          return newTransactionId;
        } catch (err) {
          // Prevent the user from being stuck on the confirmation screen without a transaction.
          navigation.goBack();
          throw err;
        }
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

        throw err;
      }
    },
    [navigateToConversionScreen, navigation, selectedAddress],
  );

  return {
    initiateConversion,
    hasSeenMusdEducationScreen,
    error,
  };
};
