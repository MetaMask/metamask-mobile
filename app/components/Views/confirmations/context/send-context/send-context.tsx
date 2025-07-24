import React, {
  ReactElement,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Hex } from '@metamask/utils';
import { TransactionParams } from '@metamask/transaction-controller';
import { toHex } from '@metamask/controller-utils';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { addTransaction } from '../../../../../util/transaction-controller';
import { selectAccounts } from '../../../../../selectors/accountTrackerController.ts';
import { selectContractBalances } from '../../../../../selectors/tokenBalancesController.ts';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { AssetType } from '../../types/token';
import { MMM_ORIGIN } from '../../constants/confirmations';
import { prepareEVMTransaction, validateAmount } from './utils.ts';

export interface SendContextType {
  amountError?: string;
  asset?: AssetType;
  cancelSend: () => void;
  sendDisabled: boolean;
  submitSend: () => void;
  transactionParams?: TransactionParams;
  updateAsset: (asset: AssetType) => void;
  updateTransactionParams: (params: Partial<TransactionParams>) => void;
}

export const SendContext = createContext<SendContextType>({
  amountError: undefined,
  asset: undefined,
  cancelSend: () => undefined,
  sendDisabled: false,
  submitSend: () => undefined,
  transactionParams: undefined,
  updateAsset: () => undefined,
  updateTransactionParams: () => undefined,
});

export const SendContextProvider: React.FC<{
  children: ReactElement[] | ReactElement;
}> = ({ children }) => {
  const navigation = useNavigation();
  const accounts = useSelector(selectAccounts);
  const contractBalances = useSelector(selectContractBalances);
  const [asset, updateAsset] = useState<AssetType>();
  const from = useSelector(selectSelectedInternalAccount);
  const [transactionParams, setTransactionParams] = useState<TransactionParams>(
    {
      from: from?.address as string,
      // to: '0x089595380921f555d52AB6f5a49defdAaB23B444',
    },
  );
  const { chainId } = asset ?? { chainId: undefined };
  const { NetworkController } = Engine.context;

  const amountError = useMemo(
    () =>
      validateAmount({
        accounts,
        amount: transactionParams.value,
        asset,
        contractBalances,
        from: from?.address as Hex,
      }),
    [accounts, asset, contractBalances, from?.address, transactionParams],
  );

  const sendDisabled = useMemo(() => {
    const { value, to } = transactionParams;
    return (
      Boolean(amountError) ||
      value === undefined ||
      value === null ||
      value === '' ||
      !to
    );
  }, [amountError, transactionParams]);

  const submitSend = useCallback(async () => {
    if (!chainId || !asset) {
      return;
    }
    // toHex is added here as sometime chainId in asset is not hexadecimal
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      toHex(chainId),
    );
    const trxnParams = prepareEVMTransaction(asset, transactionParams);
    await addTransaction(trxnParams, {
      origin: MMM_ORIGIN,
      networkClientId,
    });
    navigation.navigate(
      Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    );
  }, [asset, chainId, NetworkController, navigation, transactionParams]);

  const cancelSend = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const updateTransactionParams = (params: Partial<TransactionParams>) => {
    setTransactionParams({ ...transactionParams, ...params });
  };

  return (
    <SendContext.Provider
      value={{
        amountError,
        asset,
        cancelSend,
        sendDisabled,
        submitSend,
        transactionParams,
        updateAsset,
        updateTransactionParams,
      }}
    >
      {children}
    </SendContext.Provider>
  );
};

export const useSendContext = () => {
  const context = useContext(SendContext);
  if (!context) {
    throw new Error(
      'useSendContext must be used within an SendContextProvider',
    );
  }
  return context;
};
