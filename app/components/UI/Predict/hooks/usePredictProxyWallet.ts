import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { useSelector } from 'react-redux';
import {
  encodeCreateProxy,
  encodeComputeProxyAddress,
  getCreateSafeCreateTypedData,
  SAFE_FACTORY_ADDRESS,
  createAllowancesSafeTransaction,
  getSafeTransactionCallData,
  getSafeOwners,
} from '../providers/polymarket/PolymarketProxyWallet';
import { splitSignature } from 'ethers/lib/utils';
import { addTransaction } from '../../../../util/transaction-controller';
import { POLYGON_MAINNET_CHAIN_ID } from '../providers/polymarket/constants';
import { numberToHex } from '@metamask/utils';
import EthQuery from '@metamask/eth-query';
import { useCallback, useEffect, useState } from 'react';
import { isSmartContractAddress } from '../../../../util/transactions';
import { TransactionType } from '@metamask/transaction-controller';
import { Alert } from 'react-native';

export const usePredictProxyWallet = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [proxyAddress, setProxyAddress] = useState<string | null>(null);
  const [isProxyWalletDeployed, setIsProxyWalletDeployed] =
    useState<boolean>(false);

  const { NetworkController, KeyringController } = Engine.context;
  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );

  const networkClientId = NetworkController.findNetworkClientIdByChainId(
    numberToHex(POLYGON_MAINNET_CHAIN_ID),
  );

  const createProxyWallet = async () => {
    try {
      if (isProxyWalletDeployed) return;
      setIsLoading(true);
      const data = await getCreateSafeCreateTypedData();
      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        numberToHex(POLYGON_MAINNET_CHAIN_ID),
      );
      const signature = await KeyringController.signTypedMessage(
        { data, from: selectedInternalAccountAddress as string },
        SignTypedDataVersion.V4,
      );
      const sig = splitSignature(signature);
      const createSig = {
        v: sig.v,
        r: sig.r,
        s: sig.s,
      };

      const calldata = encodeCreateProxy({
        paymentToken: data.message.paymentToken,
        payment: data.message.payment,
        paymentReceiver: data.message.paymentReceiver,
        createSig,
      });

      const tx = await addTransaction(
        {
          from: selectedInternalAccountAddress as string,
          to: SAFE_FACTORY_ADDRESS,
          data: calldata,
        },
        {
          networkClientId,
          requireApproval: true,
          type: TransactionType.contractInteraction,
        },
      );

      return tx;
    } catch (error) {
      console.error('Error creating proxy wallet', error);
    }
  };

  const checkProxyWalletDeployed = useCallback(
    async (address: string) => {
      setIsLoading(true);
      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        numberToHex(POLYGON_MAINNET_CHAIN_ID),
      );

      const isDeployed = await isSmartContractAddress(
        address,
        numberToHex(POLYGON_MAINNET_CHAIN_ID),
        networkClientId,
      );
      setIsProxyWalletDeployed(isDeployed);
      setIsLoading(false);
    },
    [NetworkController],
  );

  const computeProxyAddress = useCallback(
    async (user: string): Promise<string> => {
      setIsLoading(true);

      const networkClient = Engine.controllerMessenger.call(
        'NetworkController:getNetworkClientById',
        networkClientId,
      );

      const ethQuery = new EthQuery(networkClient.provider);

      const callData = encodeComputeProxyAddress({ user });

      const callResult = await new Promise<string>((resolve, reject) => {
        ethQuery.sendAsync(
          {
            method: 'eth_call',
            params: [
              {
                to: SAFE_FACTORY_ADDRESS,
                data: callData,
              },
              'latest',
            ],
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error: any, result: any) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          },
        );
      });

      // Convert the padded result to actual address (remove padding, keep last 20 bytes)
      const address = '0x' + callResult.slice(-40);
      setProxyAddress(address);
      await checkProxyWalletDeployed(address);

      setIsLoading(false);

      return address;
    },
    [checkProxyWalletDeployed, networkClientId],
  );

  const createAllowances = useCallback(async () => {
    setIsLoading(true);
    try {
      const owners = await getSafeOwners({
        safeAddress: proxyAddress as string,
      });

      console.log('owners', owners);
      const safeTx = createAllowancesSafeTransaction();
      const callData = await getSafeTransactionCallData({
        signMessage: (params) => KeyringController.signMessage(params),
        signerAddress: selectedInternalAccountAddress as string,
        safeAddress: proxyAddress as string,
        txn: safeTx,
      });

      const tx = await addTransaction(
        {
          from: selectedInternalAccountAddress as string,
          to: proxyAddress as string,
          data: callData,
        },
        {
          networkClientId,
          requireApproval: true,
          type: TransactionType.contractInteraction,
        },
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        () => {
          setIsLoading(false);
        },
        (transactionMeta) => transactionMeta.id === tx.transactionMeta.id,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionFailed',
        () => {
          setIsLoading(false);
          Alert.alert('Error', 'Failed to create allowances');
        },
        ({ transactionMeta }) => transactionMeta.id === tx.transactionMeta.id,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionRejected',
        () => {
          setIsLoading(false);
          Alert.alert('Error', 'User cancelled the transaction');
        },
        ({ transactionMeta }) => transactionMeta.id === tx.transactionMeta.id,
      );

      return tx;
    } catch (error) {
      console.error('Error creating allowances', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to create allowances');
    }
  }, [
    KeyringController,
    networkClientId,
    proxyAddress,
    selectedInternalAccountAddress,
  ]);

  useEffect(() => {
    if (!selectedInternalAccountAddress) return;
    computeProxyAddress(selectedInternalAccountAddress);
  }, [selectedInternalAccountAddress, computeProxyAddress]);

  return {
    createProxyWallet,
    createAllowances,
    proxyAddress,
    isProxyWalletDeployed,
    isLoading,
  };
};
