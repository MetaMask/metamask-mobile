import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { isEqual } from 'lodash';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { EVM_SCOPE } from '../constants/networks';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectMusdConversionEducationSeen } from '../../../../reducers/user';
import { trace, TraceName, TraceOperation } from '../../../../util/trace';
import { createMusdConversionTransaction } from '../utils/musdConversionTransaction';
import { selectPendingApprovals } from '../../../../selectors/approvalController';
import { RootState } from '../../../../reducers';
import { selectTransactionsByIds } from '../../../../selectors/transactionController';

/**
 * Why do we have BOTH `existingPendingMusdConversion` AND `inFlightInitiationPromises`?
 *
 * These protect against two *different* duplication mechanisms:
 *
 * 1) `existingPendingMusdConversion` (post-approval creation / observable state):
 * Once a `musdConversion` transaction is added, it becomes a pending approval in Redux.
 * Subsequent CTA presses should **re-enter that existing flow** rather than creating a new tx.
 *
 * 2) `inFlightInitiationPromises` (pre-approval creation race window):
 * There is a short window after the CTA press where we have started the async initiation
 * but the pending approval is not yet observable in Redux. Rapid spam during that window
 * can otherwise create multiple transactions before (1) can detect an existing pending tx.
 */
const inFlightInitiationPromises = new Map<string, Promise<string | void>>();

function getInitiationKey(params: { selectedAddress: string; chainId: Hex }) {
  const { selectedAddress, chainId } = params;
  return `${selectedAddress.toLowerCase()}_${chainId.toLowerCase()}`;
}

function findExistingPendingMusdConversion(params: {
  pendingTransactionMetas: TransactionMeta[];
  selectedAddress: string;
  preferredPaymentTokenChainId: Hex;
}) {
  const {
    pendingTransactionMetas,
    selectedAddress,
    preferredPaymentTokenChainId,
  } = params;

  return pendingTransactionMetas.find((transactionMeta) => {
    if (transactionMeta?.type !== TransactionType.musdConversion) {
      return false;
    }

    if (
      transactionMeta?.chainId.toLowerCase() !==
      preferredPaymentTokenChainId.toLowerCase()
    ) {
      return false;
    }

    return (
      transactionMeta?.txParams?.from?.toLowerCase() ===
      selectedAddress.toLowerCase()
    );
  });
}

/**
 * Configuration for mUSD conversion
 */
export interface MusdConversionConfig {
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

  const pendingApprovals = useSelector(selectPendingApprovals, isEqual);

  const pendingApprovalIds = useMemo(
    () => Object.keys(pendingApprovals ?? {}),
    [pendingApprovals],
  );

  const pendingTransactionMetas = useSelector((state: RootState) =>
    selectTransactionsByIds(state, pendingApprovalIds),
  );

  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );

  const selectedAddress = selectedAccount?.address;

  const hasSeenConversionEducationScreen = useSelector(
    selectMusdConversionEducationSeen,
  );

  const navigateToConversionScreen = useCallback(
    ({
      preferredPaymentToken,
      navigationStack = Routes.EARN.ROOT,
    }: MusdConversionConfig) => {
      // Start trace for navigation to conversion screen
      trace({
        name: TraceName.MusdConversionNavigation,
        op: TraceOperation.MusdConversionOperation,
        tags: {
          paymentTokenChainId: preferredPaymentToken.chainId,
        },
      });

      navigation.navigate(navigationStack, {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        params: {
          loader: ConfirmationLoader.CustomAmount,
          preferredPaymentToken,
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
    (config: MusdConversionConfig): boolean => {
      if (config.skipEducationCheck || hasSeenConversionEducationScreen) {
        return false;
      }

      const { preferredPaymentToken, navigationStack = Routes.EARN.ROOT } =
        config;

      navigation.navigate(navigationStack, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: {
          preferredPaymentToken,
        },
      });

      return true;
    },
    [hasSeenConversionEducationScreen, navigation],
  );

  /**
   * Creates a placeholder transaction and navigates to confirmation.
   * Navigation happens immediately. Transaction creation and gas estimation happen asynchronously.
   *
   * If the user has not seen the education screen, they will be redirected there first.
   */
  const initiateConversion = useCallback(
    async (config: MusdConversionConfig): Promise<string | void> => {
      if (handleEducationRedirectIfNeeded(config)) {
        return;
      }

      const { preferredPaymentToken } = config;

      try {
        setError(null);

        if (!preferredPaymentToken) {
          throw new Error('Preferred payment token is required');
        }

        if (!selectedAddress) {
          throw new Error('No account selected');
        }

        const existingPendingMusdConversion = findExistingPendingMusdConversion(
          {
            pendingTransactionMetas,
            selectedAddress,
            preferredPaymentTokenChainId: preferredPaymentToken.chainId,
          },
        );

        /**
         * Prevents the user from creating multiple transactions.
         * Typically caused by the user quickly clicking the CTA multiple times in quick succession.
         */
        if (existingPendingMusdConversion?.id) {
          navigateToConversionScreen(config);
          return existingPendingMusdConversion.id;
        }

        const initiationKey = getInitiationKey({
          selectedAddress,
          chainId: preferredPaymentToken.chainId,
        });

        const inFlightInitiation =
          inFlightInitiationPromises.get(initiationKey);

        if (inFlightInitiation) {
          return await inFlightInitiation;
        }

        const initiationPromise = (async () => {
          const { NetworkController } = Engine.context;
          const networkClientId =
            NetworkController.findNetworkClientIdByChainId(
              preferredPaymentToken.chainId,
            );

          if (!networkClientId) {
            throw new Error(
              `Network client not found for chain ID: ${preferredPaymentToken.chainId}`,
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
            const selectedAddressHex = selectedAddress as Hex;

            const { transactionId } = await createMusdConversionTransaction({
              chainId: preferredPaymentToken.chainId,
              fromAddress: selectedAddressHex,
              recipientAddress: selectedAddressHex,
              amountHex: ZERO_HEX_VALUE,
              networkClientId,
            });

            return transactionId;
          } catch (err) {
            // Prevent the user from being stuck on the confirmation screen without a transaction.
            navigation.goBack();
            throw err;
          }
        })();

        inFlightInitiationPromises.set(initiationKey, initiationPromise);
        try {
          return await initiationPromise;
        } finally {
          inFlightInitiationPromises.delete(initiationKey);
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
      handleEducationRedirectIfNeeded,
      navigateToConversionScreen,
      navigation,
      pendingTransactionMetas,
      selectedAddress,
    ],
  );

  return {
    initiateConversion,
    hasSeenConversionEducationScreen,
    error,
  };
};
