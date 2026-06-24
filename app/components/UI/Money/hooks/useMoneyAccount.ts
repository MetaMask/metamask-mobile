import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { bytesToHex, Hex } from '@metamask/utils';
import { v4 as uuidv4, parse as uuidParse } from 'uuid';
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
import Routes from '../../../../constants/navigation/Routes';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';

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
}

function resolveNetworkClientId(chainId: Hex): string {
  const networkClientId =
    Engine.context.NetworkController.findNetworkClientIdByChainId(chainId);
  if (!networkClientId) {
    throw new Error(`${LOG_TAG} Network client not found for chain ${chainId}`);
  }
  return networkClientId;
}

export function useMoneyAccountDeposit() {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const { navigateToConfirmation } = useConfirmNavigation();

  const initiateDeposit = useCallback(
    async (options?: InitiateDepositOptions) => {
      const preferredPaymentToken = options?.preferredPaymentToken;
      const intent: MoneyAccountDepositIntent = options?.intent ?? 'convert';
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
      depositIntentByBatchId.set(batchId.toLowerCase(), intent);

      const { approveTx, depositTx } = await buildMoneyAccountDepositBatch({
        amount: BigInt(0),
        chainId: chainIdHex,
        boringVault,
        tellerAddress,
        accountantAddress,
        lensAddress,
        provider,
      });

      // Navigate early for better UX; recover on failure below.
      navigateToConfirmation({
        loader: ConfirmationLoader.CustomAmount,
        stack: Routes.MONEY.CONFIRMATIONS_ROOT,
        preferredPaymentToken,
        autoSelectFiatPayment: options?.autoSelectFiatPayment,
      });

      try {
        // We only set the transaction from the money account perspective.
        // MM Pay selects the user's account and moves funds to the money account,
        // so `from` must be the money account and `networkClientId` its chain.
        await addTransactionBatch({
          batchId,
          disableHook: true,
          disableSequential: true,
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
        depositIntentByBatchId.delete(batchId.toLowerCase());
        Logger.error(error as Error, `${LOG_TAG} Deposit transaction failed`);
        showDevErrorAlert(
          `${LOG_TAG} Deposit transaction failed`,
          error as Error,
        );
        // Rethrow so the caller can roll back navigation / surface a toast.
        throw error;
      }
    },
    [navigateToConfirmation, primaryMoneyAccount, vaultConfig],
  );

  return { initiateDeposit };
}

export function useMoneyAccountWithdrawal() {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const recipient = useSelector(selectEvmAddress);
  const { navigateToConfirmation } = useConfirmNavigation();

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

    // Navigate early for better UX; recover on failure below.
    navigateToConfirmation({
      loader: ConfirmationLoader.CustomAmount,
      stack: Routes.MONEY.CONFIRMATIONS_ROOT,
    });

    try {
      await addTransactionBatch({
        disableHook: true,
        disableSequential: true,
        from: primaryMoneyAccount.address as Hex,
        isGasFeeSponsored,
        isInternal: true,
        networkClientId,
        origin: ORIGIN_METAMASK,
        skipInitialGasEstimate: isGasFeeSponsored,
        transactions: [withdrawTx, transferTx],
      });
    } catch (error) {
      Logger.error(error as Error, `${LOG_TAG} Withdrawal transaction failed`);
      showDevErrorAlert(
        `${LOG_TAG} Withdrawal transaction failed`,
        error as Error,
      );
      // Rethrow so the caller can roll back navigation / surface a toast.
      throw error;
    }
  }, [navigateToConfirmation, primaryMoneyAccount, recipient, vaultConfig]);

  return { initiateWithdrawal };
}
