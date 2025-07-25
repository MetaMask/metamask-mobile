import React, {
  ReactElement,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import { TransactionParams } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';

import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { AssetType } from '../../types/token';

export interface SendContextType {
  asset?: AssetType;
  transactionParams: TransactionParams;
  updateAsset: (asset: AssetType) => void;
  updateTransactionParams: (params: Partial<TransactionParams>) => void;
}

export const SendContext = createContext<SendContextType>({
  asset: undefined,
  transactionParams: {} as TransactionParams,
  updateAsset: () => undefined,
  updateTransactionParams: () => undefined,
});

export const SendContextProvider: React.FC<{
  children: ReactElement[] | ReactElement;
}> = ({ children }) => {
  const [asset, updateAsset] = useState<AssetType>();
  const from = useSelector(selectSelectedInternalAccount);
  const [transactionParams, setTransactionParams] = useState<TransactionParams>(
    {
      from: from?.address as string,
      // to: '0x089595380921f555d52AB6f5a49defdAaB23B444',
    },
  );

  const updateTransactionParams = useCallback(
    (params: Partial<TransactionParams>) => {
      setTransactionParams({ ...transactionParams, ...params });
    },
    [setTransactionParams, transactionParams],
  );

  return (
    <SendContext.Provider
      value={{
        asset,
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
