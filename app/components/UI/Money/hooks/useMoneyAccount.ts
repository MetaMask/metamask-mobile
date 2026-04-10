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
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectDefaultEndpointByChainId } from '../../../../selectors/networkController';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import {
  buildMoneyAccountDepositBatch,
  buildMoneyAccountWithdraw,
} from '../utils/moneyAccountTransactions';
import { RootState } from '../../../../reducers';
import Engine from '../../../../core/Engine';

function useMoneyAccountContext() {
  const selectedAccount = useSelector(selectSelectedInternalAccountAddress);
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const endpoint = useSelector((state: RootState) =>
    vaultConfig.chainId
      ? selectDefaultEndpointByChainId(state, vaultConfig.chainId as Hex)
      : undefined,
  );

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

  return { selectedAccount, vaultConfig, endpoint, getProvider };
}

export function useMoneyAccountDeposit() {
  const { selectedAccount, vaultConfig, endpoint, getProvider } =
    useMoneyAccountContext();

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
        !selectedAccount ||
        !chainId ||
        !boringVault ||
        !tellerAddress ||
        !accountantAddress ||
        !lensAddress ||
        !endpoint?.networkClientId
      ) {
        // TODO: error handling?
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

      await addTransactionBatch({
        from: selectedAccount as Hex,
        networkClientId: endpoint.networkClientId,
        origin: ORIGIN_METAMASK,
        requireApproval: true,
        transactions: [approveTx, depositTx],
      });
    },
    [selectedAccount, vaultConfig, endpoint, getProvider],
  );

  return { initiateDeposit };
}

export function useMoneyAccountWithdrawal() {
  const { selectedAccount, vaultConfig, endpoint, getProvider } =
    useMoneyAccountContext();

  const initiateWithdrawal = useCallback(
    async (amount: bigint) => {
      const { chainId, tellerAddress, accountantAddress } = vaultConfig;

      if (
        !selectedAccount ||
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
        toAddress: selectedAccount,
        provider,
      });

      await addTransaction(
        { from: selectedAccount as Hex, ...params },
        {
          ...options,
          networkClientId: endpoint.networkClientId,
          deviceConfirmedOn: WalletDevice.MM_MOBILE,
        },
      );
    },
    [selectedAccount, vaultConfig, endpoint, getProvider],
  );

  return { initiateWithdrawal };
}
