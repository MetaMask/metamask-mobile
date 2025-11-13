import { Hex } from '@metamask/utils';
import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { generateTransferData } from '../../../../util/transactions';
import { MUSD_CONVERSION_TRANSACTION_TYPE } from '../constants/musd';
import { MMM_ORIGIN } from '../../../Views/confirmations/constants/confirmations';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

/**
 * Configuration for token conversion
 */
export interface TokenConversionConfig {
  /**
   * The output token to convert to
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
   * Optional navigation stack to use (defaults to Routes.EARN.ROOT)
   */
  navigationStack?: string;
}

/**
 * Hook for initiating EVM token conversion flow using MetaMask Pay.
 *
 * **EVM-Only**: This hook only supports EVM-compatible chains. It uses ERC-20
 * transfer encoding and MetaMask Pay's Relay integration, which are specific to
 * EVM networks. For non-EVM chains (Bitcoin, Solana, Tron), use alternative flows.
 *
 * This hook handles both transaction creation and navigation to the confirmation screen.
 *
 * @example
 * const { initiateConversion } = useEvmTokenConversion();
 *
 * await initiateConversion({
 *   outputToken: {
 *     address: MUSD_ADDRESS_ETHEREUM,
 *     chainId: ETHEREUM_MAINNET_CHAIN_ID,
 *   },
 *   preferredPaymentToken: {
 *     address: USDC_ADDRESS_ARBITRUM,
 *     chainId: NETWORKS_CHAIN_ID.ARBITRUM,
 *   },
 * });
 */
export const useEvmTokenConversion = () => {
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

  // TODO: Double check this when adding support for other networks. We want to ensure the user correctly sends to themselves.
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  /**
   * Converts tokens by creating a placeholder transaction and navigating to confirmation.
   * Navigation happens immediately, then transaction creation happens in background.
   * This matches the pattern used by Predict feature hooks.
   */
  const initiateConversion = useCallback(
    async (config: TokenConversionConfig): Promise<string> => {
      const {
        outputToken,
        preferredPaymentToken,
        navigationStack = Routes.EARN.ROOT,
      } = config;

      if (!outputToken || !preferredPaymentToken) {
        throw new Error(
          'Output token and preferred payment token are required',
        );
      }

      try {
        setError(null);

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

        // Navigate to confirmation screen immediately for better UX.
        navigation.navigate(navigationStack, {
          screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          params: {
            preferredPaymentToken,
            outputToken: {
              address: outputToken.address,
              chainId: outputToken.chainId,
              symbol: outputToken.symbol,
              name: outputToken.name,
              decimals: outputToken.decimals,
            },
          },
        });

        const ZERO_HEX_VALUE = '0x0';

        // Create minimal transfer data with amount = 0
        // The actual amount will be set by the user on the confirmation screen
        const transferData = generateTransferData('transfer', {
          toAddress: selectedAddress, // Transfer to self
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
            networkClientId,
            origin: MMM_ORIGIN,
            type: MUSD_CONVERSION_TRANSACTION_TYPE,
            // Nested transaction is required for Relay to work. This will be fixed in a future iteration.
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
            : 'Failed to create token conversion transaction';

        Logger.error(
          err as Error,
          '[Token Conversion] Failed to create conversion transaction',
        );

        setError(errorMessage);
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
