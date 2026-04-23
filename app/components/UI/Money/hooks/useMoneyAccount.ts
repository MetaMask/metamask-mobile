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
    // TODO: remove the account parameter and instead of directly building approve and deposit transactions
    // we need to implemend a hook from `addTransactionBatch` from which we can get the user inputed amount
    // and then use that to build the approve and deposit transactions. This is because user inputs the amount
    // in the MM pay UI and we need to use that amount.
    async (amount: bigint) => {
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

      const networkClientId =
        Engine.context.NetworkController.findNetworkClientIdByChainId(
          chainIdHex,
        );

      // TODO: as mentioned above this should move into hook from `addTransactionBatch`.
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
      if (!vaultConfig) {
        throw new Error(`${LOG_TAG} Missing vault config`);
      }
      if (!primaryMoneyAccount?.address) {
        throw new Error(`${LOG_TAG} Missing money account address`);
      }

      const { chainId, tellerAddress, accountantAddress } = vaultConfig;

      const chainIdHex = chainId as Hex;
      const provider = getProviderByChainId(chainIdHex);
      if (!provider) {
        throw new Error(
          `${LOG_TAG} No provider available for chain ${chainId}`,
        );
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
