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

  const initiateDeposit = useCallback(async () => {
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
      throw new Error(`${LOG_TAG} No provider available for chain ${chainId}`);
    }

    const networkClientId = resolveNetworkClientId(chainIdHex);

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
        requiredAssets: [
          {
            address: getMoneyAccountDepositAssetAddress(chainIdHex),
            amount: '0x0' as Hex,
            standard: 'erc20',
          },
        ],
      });
    } catch (error) {
      Logger.error(error as Error, `${LOG_TAG} Deposit transaction failed`);
      // Rethrow so the caller can roll back navigation / surface a toast.
      throw error;
    }
  }, [navigateToConfirmation, primaryMoneyAccount, vaultConfig]);

  return { initiateDeposit };
}

export function useMoneyAccountWithdrawal() {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
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

      const networkClientId = resolveNetworkClientId(chainIdHex);

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
        // Rethrow so the caller can roll back navigation / surface a toast.
        throw error;
      }
    },
    [navigateToConfirmation, primaryMoneyAccount, vaultConfig],
  );

  return { initiateWithdrawal };
}
