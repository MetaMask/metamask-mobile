import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { bytesToHex, Hex } from '@metamask/utils';
import { v4 as uuidv4, parse as uuidParse } from 'uuid';
import { containsUserRejectedError } from '../../../../util/middlewares';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectEvmAddress } from '../../../../selectors/accountsController';
import {
  buildMoneyAccountDepositBatch,
  buildMoneyAccountWithdrawBatch,
  getMoneyAccountDepositAssetAddress,
} from '../utils/moneyAccountTransactions';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import Logger from '../../../../util/Logger';
import { showDevErrorAlert } from '../utils/devErrorAlert';
import { isMonadMainnetChainId } from '../../../../util/networks';
import Engine from '../../../../core/Engine';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { ensureError } from '../../../../util/errorUtils';
import { getErrorCode, getErrorMessage } from '../utils/errorUtils';
import useMoneyToasts from './useMoneyToasts';

const LOG_TAG = '[Money Account]';

export type MoneyAccountDepositIntent = 'convert' | 'addMusd' | 'card';

const depositIntentByBatchId = new Map<string, MoneyAccountDepositIntent>();

export function getMoneyAccountDepositIntent(
  batchId: string | undefined,
): MoneyAccountDepositIntent | undefined {
  if (!batchId) return undefined;
  return depositIntentByBatchId.get(batchId.toLowerCase());
}

export function clearMoneyAccountDepositIntent(
  batchId: string | undefined,
): void {
  if (!batchId) return;
  depositIntentByBatchId.delete(batchId.toLowerCase());
}

export interface InitiateDepositOptions {
  preferredPaymentToken?: {
    address: Hex;
    chainId: Hex;
  };
  intent?: MoneyAccountDepositIntent;
  autoSelectFiatPayment?: boolean;
  replaceConfirmation?: boolean;
}

function resolveNetworkClientId(chainId: Hex): string {
  const networkClientId =
    Engine.context.NetworkController.findNetworkClientIdByChainId(chainId);
  if (!networkClientId) {
    throw new Error(`${LOG_TAG} Network client not found for chain ${chainId}`);
  }
  return networkClientId;
}

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function isUserRejectedError(error: unknown, fallbackMessage: string): boolean {
  return containsUserRejectedError(
    getErrorMessage(error, fallbackMessage),
    getErrorCode(error),
  );
}

function isMoneyConfirmationActive(): boolean {
  return (
    NavigationService.navigation.getCurrentRoute()?.name ===
    Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS
  );
}

export function useMoneyAccountDeposit() {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const { navigateToConfirmation } = useConfirmNavigation();
  const navigation = useNavigation();
  const { showToast, MoneyToastOptions } = useMoneyToasts();

  const initiateDeposit = useCallback(
    async (options?: InitiateDepositOptions) => {
      const preferredPaymentToken = options?.preferredPaymentToken;
      if (!vaultConfig) {
        throw new Error(`${LOG_TAG} Missing vault config`);
      }
      if (!primaryMoneyAccount?.address) {
        throw new Error(`${LOG_TAG} Missing money account address`);
      }

      const {
        chainId,
        boringVault,
        tellerAddress,
        accountantAddress,
        lensAddress,
      } = vaultConfig;

      const chainIdHex = chainId as Hex;
      const provider = getProviderByChainId(chainIdHex);
      if (!provider) {
        throw new Error(
          `${LOG_TAG} No provider available for chain ${chainId}`,
        );
      }

      const networkClientId = resolveNetworkClientId(chainIdHex);
      const isGasFeeSponsored = isMonadMainnetChainId(chainIdHex);

      const batchId = bytesToHex(new Uint8Array(uuidParse(uuidv4())));
      // Only record an explicit funding intent (card / addMusd). Generic deposits
      // (e.g. the home "Add" button) are left unset so the toast derives the
      // intent from the transaction's actual payment method instead of a guess.
      if (options?.intent) {
        depositIntentByBatchId.set(batchId.toLowerCase(), options.intent);
      }

      const confirmationParams = {
        loader: ConfirmationLoader.AdvancedCustomAmount,
        preferredPaymentToken,
        autoSelectFiatPayment: options?.autoSelectFiatPayment,
      };

      // Navigate early for better UX; recover on failure below.
      navigateToConfirmation({
        ...confirmationParams,
        stack: Routes.MONEY.CONFIRMATIONS_ROOT,
        replace: options?.replaceConfirmation,
      });

      try {
        // Allows confirmation skeleton to render immediately before setup work for immediate navigation.
        await waitForNextFrame();

        const { approveTx, depositTx } = await buildMoneyAccountDepositBatch({
          amount: BigInt(0),
          chainId: chainIdHex,
          boringVault,
          tellerAddress,
          accountantAddress,
          lensAddress,
          provider,
        });

        // We only set the transaction from the money account perspective.
        // MM Pay selects the user's account and moves funds to the money account,
        // so `from` must be the money account and `networkClientId` its chain.
        await addTransactionBatch({
          batchId,
          disableHook: true,
          disableSequential: true,
          disableUpgrade: true,
          from: primaryMoneyAccount.address as Hex,
          isGasFeeSponsored,
          isInternal: true,
          networkClientId,
          origin: ORIGIN_METAMASK,
          requiredAssets: [
            {
              address: getMoneyAccountDepositAssetAddress(chainIdHex),
              amount: '0x0' as Hex,
              standard: 'erc20',
            },
          ],
          skipInitialGasEstimate: isGasFeeSponsored,
          transactions: [approveTx, depositTx],
        });
      } catch (error) {
        const errorObj = ensureError(error, `${LOG_TAG} Deposit setup failed`);
        depositIntentByBatchId.delete(batchId.toLowerCase());
        if (!isUserRejectedError(error, errorObj.message)) {
          if (isMoneyConfirmationActive()) {
            navigation.goBack();
          }
          showToast(
            MoneyToastOptions.deposit.failed({ intent: options?.intent }),
          );
        }
        Logger.error(errorObj, `${LOG_TAG} Deposit setup failed`);
        showDevErrorAlert(`${LOG_TAG} Deposit setup failed`, errorObj);
        // Rethrow so the caller can log the failed initiation.
        throw error;
      }
    },
    [
      MoneyToastOptions.deposit,
      navigateToConfirmation,
      navigation,
      primaryMoneyAccount,
      showToast,
      vaultConfig,
    ],
  );

  return { initiateDeposit };
}

export function useMoneyAccountWithdrawal() {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const recipient = useSelector(selectEvmAddress);
  const { navigateToConfirmation } = useConfirmNavigation();
  const navigation = useNavigation();
  const { showToast, MoneyToastOptions } = useMoneyToasts();

  const initiateWithdrawal = useCallback(async () => {
    if (!vaultConfig) {
      throw new Error(`${LOG_TAG} Missing vault config`);
    }
    if (!primaryMoneyAccount?.address) {
      throw new Error(`${LOG_TAG} Missing money account address`);
    }
    if (!recipient) {
      throw new Error(`${LOG_TAG} Missing recipient EVM address`);
    }

    const { chainId, tellerAddress, accountantAddress } = vaultConfig;

    const chainIdHex = chainId as Hex;
    const provider = getProviderByChainId(chainIdHex);
    if (!provider) {
      throw new Error(`${LOG_TAG} No provider available for chain ${chainId}`);
    }

    const networkClientId = resolveNetworkClientId(chainIdHex);
    const isGasFeeSponsored = isMonadMainnetChainId(chainIdHex);

    // Show the confirmation skeleton while the withdrawal batch is created.
    navigateToConfirmation({
      loader: ConfirmationLoader.AdvancedCustomAmount,
      stack: Routes.MONEY.CONFIRMATIONS_ROOT,
    });

    try {
      // Allows confirmation skeleton to render immediately before setup work for immediate navigation.
      await waitForNextFrame();

      // Placeholder amount — MM Pay re-encodes both calls via
      // `updateMoneyAccountWithdrawTokenAmount` once the user picks an amount.
      const { withdrawTx, transferTx } = await buildMoneyAccountWithdrawBatch({
        amount: BigInt(0),
        chainId: chainIdHex,
        tellerAddress: tellerAddress as Hex,
        accountantAddress: accountantAddress as Hex,
        moneyAccountAddress: primaryMoneyAccount.address as Hex,
        recipient: recipient as Hex,
        provider,
      });

      await addTransactionBatch({
        disableHook: true,
        disableSequential: true,
        disableUpgrade: true,
        from: primaryMoneyAccount.address as Hex,
        isGasFeeSponsored,
        isInternal: true,
        networkClientId,
        origin: ORIGIN_METAMASK,
        skipInitialGasEstimate: isGasFeeSponsored,
        transactions: [withdrawTx, transferTx],
      });
    } catch (error) {
      const errorObj = ensureError(
        error,
        `${LOG_TAG} Withdrawal transaction failed`,
      );
      if (!isUserRejectedError(error, errorObj.message)) {
        if (isMoneyConfirmationActive()) {
          navigation.goBack();
        }
        showToast(MoneyToastOptions.withdraw.failed());
      }
      Logger.error(errorObj, `${LOG_TAG} Withdrawal transaction failed`);
      showDevErrorAlert(`${LOG_TAG} Withdrawal transaction failed`, errorObj);
      // Rethrow so the caller can roll back navigation / surface a toast.
      throw error;
    }
  }, [
    MoneyToastOptions.withdraw,
    navigateToConfirmation,
    navigation,
    primaryMoneyAccount,
    recipient,
    showToast,
    vaultConfig,
  ]);

  return { initiateWithdrawal };
}
