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
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { EVM_SCOPE } from '../constants/networks';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectMusdConversionEducationSeen } from '../../../../reducers/user';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useMusdConversionTokens } from './useMusdConversionTokens';
import { useMusdQuickConvertPercentage } from './useMusdQuickConvertPercentage';

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
 * Configuration for custom amount mUSD conversion.
 */
export interface CustomConversionConfig {
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
  /**
   * Skip the education screen check. Used when calling from the education view itself
   */
  skipEducationCheck?: boolean;
}

/**
 * Hook for initiating mUSD conversion flows using MetaMask Pay.
 *
 * **EVM-Only**: This hook only supports EVM-compatible chains. It uses ERC-20
 * transfer encoding and MetaMask Pay's Relay integration, which are specific to
 * EVM networks.
 *
 * This hook provides two conversion modes:
 * - **Max conversion**: Converts the full token balance in a single action
 * - **Custom conversion**: Opens a screen where the user can specify the amount
 *
 * @example
 * // Max conversion (full balance)
 * const { initiateMaxConversion, isMaxConversionLoading } = useMusdConversion();
 * await initiateMaxConversion(token);
 *
 * @example
 * // Custom amount conversion
 * const { initiateCustomConversion } = useMusdConversion();
 * await initiateCustomConversion({
 *   outputChainId: CHAIN_IDS.MAINNET,
 *   preferredPaymentToken: { address: USDC_ADDRESS, chainId: CHAIN_IDS.MAINNET },
 * });
 */
export const useMusdConversion = () => {
  const [isMaxConversionLoading, setIsMaxConversionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

  const { getMusdOutputChainId, getMusdTokenAddress } =
    useMusdConversionTokens();
  const { applyPercentage } = useMusdQuickConvertPercentage();

  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const selectedAddress = selectedAccount?.address;
  const hasSeenEducation = useSelector(selectMusdConversionEducationSeen);

  /**
   * Initiates a max-amount mUSD conversion.
   *
   * This creates a transaction with the full token balance and navigates
   * to the max conversion confirmation modal.
   */
  const initiateMaxConversion = useCallback(
    async (token: AssetType): Promise<MaxConversionResult> => {
      const tokenAddress = token.address as Hex;
      const tokenChainId = token.chainId as Hex;
      const outputChainId = getMusdOutputChainId(tokenChainId);

      try {
        setIsMaxConversionLoading(true);
        setError(null);

        if (!tokenAddress || !tokenChainId) {
          throw new Error('Token address and chainId are required');
        }

        if (!token.rawBalance || token.rawBalance === '0x0') {
          throw new Error('Token balance must be greater than zero');
        }

        if (!selectedAddress) {
          throw new Error('No account selected');
        }

        const networkClientId =
          Engine.context.NetworkController.findNetworkClientIdByChainId(
            outputChainId,
          );

        if (!networkClientId) {
          throw new Error(
            `Network client not found for chain ID: ${outputChainId}`,
          );
        }

        const mUSDTokenAddress = getMusdTokenAddress(outputChainId);

        // Generate transfer data with adjusted amount (based on percentage from feature flag)
        // Note: We use the token's rawBalance which is already in minimal units (hex)
        const adjustedBalance = applyPercentage(token.rawBalance as Hex);
        const transferData = generateTransferData('transfer', {
          toAddress: selectedAddress,
          amount: adjustedBalance,
        });

        const { TransactionController, TransactionPayController } =
          Engine.context;

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
        setIsMaxConversionLoading(false);
      }
    },
    [
      applyPercentage,
      getMusdTokenAddress,
      getMusdOutputChainId,
      navigation,
      selectedAddress,
    ],
  );

  /**
   * Navigates to the custom amount conversion screen.
   */
  const navigateToConversionScreen = useCallback(
    ({
      outputChainId,
      preferredPaymentToken,
      navigationStack = Routes.EARN.ROOT,
    }: CustomConversionConfig) => {
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
   * Checks if user needs to see education screen and redirects if so.
   * @returns true if redirected to education, false if user can proceed
   */
  const handleEducationRedirectIfNeeded = useCallback(
    (config: CustomConversionConfig): boolean => {
      if (config.skipEducationCheck || hasSeenEducation) {
        return false;
      }

      const {
        outputChainId,
        preferredPaymentToken,
        navigationStack = Routes.EARN.ROOT,
      } = config;

      navigation.navigate(navigationStack, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: {
          preferredPaymentToken,
          outputChainId,
        },
      });

      return true;
    },
    [hasSeenEducation, navigation],
  );

  /**
   * Initiates a custom amount mUSD conversion.
   *
   * Creates a placeholder transaction and navigates to the confirmation screen
   * where the user can specify the amount to convert.
   *
   * If the user has not seen the education screen, they will be redirected there first.
   */
  const initiateCustomConversion = useCallback(
    async (config: CustomConversionConfig): Promise<string | void> => {
      if (handleEducationRedirectIfNeeded(config)) {
        return;
      }

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

        const networkClientId =
          Engine.context.NetworkController.findNetworkClientIdByChainId(
            outputChainId,
          );

        if (!networkClientId) {
          throw new Error(
            `Network client not found for chain ID: ${outputChainId}`,
          );
        }

        const mUSDTokenAddress = getMusdTokenAddress(outputChainId);

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
              },
            );

          return transactionMeta.id;
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
    [
      getMusdTokenAddress,
      handleEducationRedirectIfNeeded,
      navigateToConversionScreen,
      navigation,
      selectedAddress,
    ],
  );

  /**
   * Resets the error state.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    initiateMaxConversion,
    initiateCustomConversion,
    clearError,
    isMaxConversionLoading,
    error,
    hasSeenEducation,
  };
};
