import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { WalletDevice } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import {
  addTransaction,
  addTransactionBatch,
} from '../../../../util/transaction-controller';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import {
  buildMoneyAccountDepositBatch,
  buildMoneyAccountWithdraw,
} from '../utils/moneyAccountTransactions';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import Logger from '../../../../util/Logger';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';

const LOG_TAG = '[Money Account]';

function useMoneyAccountContext() {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);

  return { primaryMoneyAccount, vaultConfig };
}

export function useMoneyAccountDeposit() {
  const { primaryMoneyAccount, vaultConfig } = useMoneyAccountContext();
  const { navigateToConfirmation } = useConfirmNavigation();

  const initiateDeposit = useCallback(
    async (amount: bigint) => {
      if (!vaultConfig || !primaryMoneyAccount?.address) {
        Logger.error(
          new Error(`${LOG_TAG} Missing vault config or money account address`),
        );
        return;
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
        Logger.error(
          new Error(`${LOG_TAG} No provider available for chain ${chainId}`),
        );
        return;
      }

      const networkClientId =
        Engine.context.NetworkController.findNetworkClientIdByChainId(
          chainIdHex,
        );

      const { approveTx, depositTx } = await buildMoneyAccountDepositBatch({
        amount,
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
        stack: Routes.MONEY.ROOT,
      });

      try {
        // We only set the transaction from the money account perspective.
        // MM Pay selects the user's account and moves funds to the money account,
        // so `from` must be the money account and `networkClientId` its chain.
        await addTransactionBatch({
          from: primaryMoneyAccount.address as Hex,
          networkClientId,
          origin: ORIGIN_METAMASK,
          disableHook: true,
          disableSequential: true,
          transactions: [approveTx, depositTx],
        });
      } catch (error) {
        Logger.error(error as Error, `${LOG_TAG} Deposit transaction failed`);
      }
    },
    [navigateToConfirmation, primaryMoneyAccount, vaultConfig],
  );

  return { initiateDeposit };
}

export function useMoneyAccountWithdrawal() {
  const { primaryMoneyAccount, vaultConfig } = useMoneyAccountContext();
  const { navigateToConfirmation } = useConfirmNavigation();

  const initiateWithdrawal = useCallback(
    async (amount: bigint) => {
      if (!vaultConfig || !primaryMoneyAccount?.address) {
        Logger.error(
          new Error(`${LOG_TAG} Missing vault config or money account address`),
        );
        return;
      }

      const { chainId, tellerAddress, accountantAddress } = vaultConfig;

      const chainIdHex = chainId as Hex;
      const provider = getProviderByChainId(chainIdHex);
      if (!provider) {
        Logger.error(
          new Error(`${LOG_TAG} No provider available for chain ${chainId}`),
        );
        return;
      }

      const networkClientId =
        Engine.context.NetworkController.findNetworkClientIdByChainId(
          chainIdHex,
        );

      const { params, options } = await buildMoneyAccountWithdraw({
        amount,
        chainId: chainIdHex,
        tellerAddress,
        accountantAddress,
        toAddress: primaryMoneyAccount.address as Hex,
        provider,
      });

      // Navigate early for better UX; recover on failure below.
      navigateToConfirmation({
        loader: ConfirmationLoader.CustomAmount,
        stack: Routes.MONEY.ROOT,
      });

      try {
        await addTransaction(
          { from: primaryMoneyAccount.address as Hex, ...params },
          {
            ...options,
            networkClientId,
            deviceConfirmedOn: WalletDevice.MM_MOBILE,
          },
        );
      } catch (error) {
        Logger.error(
          error as Error,
          `${LOG_TAG} Withdrawal transaction failed`,
        );
      }
    },
    [navigateToConfirmation, primaryMoneyAccount, vaultConfig],
  );

  return { initiateWithdrawal };
}
