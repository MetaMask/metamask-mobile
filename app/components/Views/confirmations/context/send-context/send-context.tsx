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
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import useMaxAmount from '../../hooks/send/useMaxAmount.ts';
import useValidateAmount from '../../hooks/send/useValidateAmount.ts';
import { AssetType } from '../../types/token';
import { MMM_ORIGIN } from '../../constants/confirmations';
import { prepareEVMTransaction } from '../../utils/send.ts';

export interface SendContextType {
  amountError?: string;
  asset?: AssetType;
  cancelSend: () => void;
  submitSend: () => void;
  transactionParams: TransactionParams;
  updateAsset: (asset: AssetType) => void;
  updateToMaxAmount: () => void;
  updateTransactionParams: (params: Partial<TransactionParams>) => void;
}

export const SendContext = createContext<SendContextType>({
  amountError: undefined,
  asset: undefined,
  cancelSend: () => undefined,
  submitSend: () => undefined,
  transactionParams: {} as TransactionParams,
  updateAsset: () => undefined,
  updateToMaxAmount: () => undefined,
  updateTransactionParams: () => undefined,
});

export const SendContextProvider: React.FC<{
  children: ReactElement[] | ReactElement;
}> = ({ children }) => {
  const navigation = useNavigation();
  const { validateAmount } = useValidateAmount();
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
  const networkClientId = useMemo(
    () =>
      chainId
        ? NetworkController.findNetworkClientIdByChainId(toHex(chainId))
        : undefined,
    [chainId],
  );
  const { getMaxValue } = useMaxAmount(networkClientId);

  const amountError = useMemo(
    () => validateAmount(from?.address as Hex, transactionParams.value, asset),
    [asset, from?.address, transactionParams.value, validateAmount],
  );

  const submitSend = useCallback(async () => {
    if (!networkClientId || !asset) {
      return;
    }
    // toHex is added here as sometime chainId in asset is not hexadecimal
    const trxnParams = prepareEVMTransaction(asset, transactionParams);
    await addTransaction(trxnParams, {
      origin: MMM_ORIGIN,
      networkClientId,
    });
    navigation.navigate(
      Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    );
  }, [
    asset,
    networkClientId,
    NetworkController,
    navigation,
    transactionParams,
  ]);

  const cancelSend = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const updateTransactionParams = useCallback(
    (params: Partial<TransactionParams>) => {
      setTransactionParams({ ...transactionParams, ...params });
    },
    [setTransactionParams, transactionParams],
  );

  const updateToMaxAmount = useCallback(() => {
    const value = getMaxValue(from?.address as Hex, asset);
    updateTransactionParams({
      value,
    });
  }, [asset, from, getMaxValue, updateTransactionParams]);

  return (
    <SendContext.Provider
      value={{
        amountError,
        asset,
        cancelSend,
        submitSend,
        transactionParams,
        updateAsset,
        updateToMaxAmount,
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
