import React, {
  ReactElement,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import { Hex } from '@metamask/utils';
import { TransactionParams } from '@metamask/transaction-controller';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { addTransaction } from '../../../../../util/transaction-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../UI/Tokens/types';
import { MMM_ORIGIN } from '../../constants/confirmations';

export interface SendContextType {
  asset?: TokenI;
  cancelSend: () => void;
  submitSend: () => void;
  transactionParams?: TransactionParams;
  updateAsset: (asset: TokenI) => void;
  updateTransactionParams: (params: Partial<TransactionParams>) => void;
}

export const SendContext = createContext<SendContextType>({
  asset: undefined,
  cancelSend: () => undefined,
  submitSend: () => undefined,
  transactionParams: undefined,
  updateAsset: () => undefined,
  updateTransactionParams: () => undefined,
});

export const SendContextProvider: React.FC<{
  children: ReactElement[] | ReactElement;
}> = ({ children }) => {
  const navigation = useNavigation();
  const [asset, updateAsset] = useState<TokenI>();
  const from = useSelector(selectSelectedInternalAccount);
  const [transactionParams, setTransactionParams] = useState<TransactionParams>(
    {
      from: from?.address as string,
      // to: '0x089595380921f555d52AB6f5a49defdAaB23B444',
    },
  );
  const { chainId } = asset ?? { chainId: undefined };
  const { NetworkController } = Engine.context;

  const updateTransactionParams = (params: Partial<TransactionParams>) => {
    setTransactionParams({ ...transactionParams, ...params });
  };

  const submitSend = useCallback(async () => {
    if (!chainId) {
      return;
    }
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      chainId as Hex,
    );
    await addTransaction(transactionParams, {
      origin: MMM_ORIGIN,
      networkClientId,
    });
    navigation.navigate(
      Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    );
  }, [chainId, NetworkController, navigation, transactionParams]);

  const cancelSend = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SendContext.Provider
      value={{
        asset,
        cancelSend,
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
