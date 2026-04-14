import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { ethers } from 'ethers';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { WalletDevice } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import {
  addTransaction,
  addTransactionBatch,
} from '../../../../util/transaction-controller';
import { selectDefaultEndpointByChainId } from '../../../../selectors/networkController';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import {
  buildMoneyAccountDepositBatch,
  buildMoneyAccountWithdraw,
} from '../utils/moneyAccountTransactions';
import { RootState } from '../../../../reducers';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';

function useMoneyAccountContext() {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const endpoint = useSelector((state: RootState) =>
    vaultConfig.chainId
      ? selectDefaultEndpointByChainId(state, vaultConfig.chainId as Hex)
      : undefined,
  );

  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);

  const getProvider = useCallback(():
    | ethers.providers.Web3Provider
    | undefined => {
    if (!endpoint?.networkClientId) {
      return undefined;
    }
    const externalProvider =
      Engine.context.NetworkController.getNetworkClientById(
        endpoint.networkClientId,
      ).provider;
    return new ethers.providers.Web3Provider(externalProvider);
  }, [endpoint]);

  return { primaryMoneyAccount, vaultConfig, endpoint, getProvider };
}

export function useMoneyAccountDeposit() {
  const { primaryMoneyAccount, vaultConfig, endpoint, getProvider } =
    useMoneyAccountContext();
  const { navigateToConfirmation } = useConfirmNavigation();

  const initiateDeposit = useCallback(
    async (amount: bigint) => {
      const {
        chainId,
        boringVault,
        tellerAddress,
        accountantAddress,
        lensAddress,
      } = vaultConfig;

      if (
        !primaryMoneyAccount?.address ||
        !chainId ||
        !boringVault ||
        !tellerAddress ||
        !accountantAddress ||
        !lensAddress ||
        !endpoint?.networkClientId
      ) {
        return;
      }

      const provider = getProvider();
      if (!provider) {
        return;
      }

      const { approveTx, depositTx } = await buildMoneyAccountDepositBatch({
        amount,
        chainId: chainId as Hex,
        boringVault,
        tellerAddress,
        accountantAddress,
        lensAddress,
        provider,
      });

      navigateToConfirmation({
        loader: ConfirmationLoader.CustomAmount,
        stack: Routes.MONEY.ROOT,
      });

      /*
       * We are only setting the transaction we want to do from the money account. MM pay takes care of selecting users account and moving the funds to the money account.
       * Because of that we need from to be set to the money account and networkClientId needs to be set to the network the money account is on.
       */
      await addTransactionBatch({
        from: primaryMoneyAccount.address as Hex,
        networkClientId: endpoint.networkClientId,
        origin: ORIGIN_METAMASK,
        disableHook: true,
        disableSequential: true,
        transactions: [approveTx, depositTx],
      });
    },
    [
      navigateToConfirmation,
      primaryMoneyAccount,
      vaultConfig,
      endpoint,
      getProvider,
    ],
  );

  return { initiateDeposit };
}

export function useMoneyAccountWithdrawal() {
  const { primaryMoneyAccount, vaultConfig, endpoint, getProvider } =
    useMoneyAccountContext();
  const { navigateToConfirmation } = useConfirmNavigation();

  const initiateWithdrawal = useCallback(
    async (amount: bigint) => {
      const { chainId, tellerAddress, accountantAddress } = vaultConfig;

      if (
        !primaryMoneyAccount?.address ||
        !chainId ||
        !tellerAddress ||
        !accountantAddress ||
        !endpoint?.networkClientId
      ) {
        return;
      }

      const provider = getProvider();
      if (!provider) {
        return;
      }

      const { params, options } = await buildMoneyAccountWithdraw({
        amount,
        chainId: chainId as Hex,
        tellerAddress,
        accountantAddress,
        toAddress: primaryMoneyAccount.address as Hex,
        provider,
      });

      navigateToConfirmation({
        loader: ConfirmationLoader.CustomAmount,
        stack: Routes.MONEY.ROOT,
      });

      await addTransaction(
        { from: primaryMoneyAccount.address as Hex, ...params },
        {
          ...options,
          networkClientId: endpoint.networkClientId,
          deviceConfirmedOn: WalletDevice.MM_MOBILE,
        },
      );
    },
    [
      navigateToConfirmation,
      primaryMoneyAccount,
      vaultConfig,
      endpoint,
      getProvider,
    ],
  );

  return { initiateWithdrawal };
}
