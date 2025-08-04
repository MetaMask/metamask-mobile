import { Hex } from '@metamask/utils';
import React, {
  ReactElement,
  createContext,
  useContext,
  useState,
} from 'react';
import { useSelector } from 'react-redux';

import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { AssetType } from '../../types/token';

export interface SendContextType {
  asset?: AssetType;
  from: Hex;
  to?: Hex;
  updateAsset: (asset: AssetType) => void;
  updateTo: (to: Hex) => void;
  updateValue: (value: string) => void;
  value?: string;
}

export const SendContext = createContext<SendContextType>({
  asset: undefined,
  from: '0x',
  to: undefined,
  updateAsset: () => undefined,
  updateTo: () => undefined,
  updateValue: () => undefined,
  value: undefined,
});

export const SendContextProvider: React.FC<{
  children: ReactElement[] | ReactElement;
}> = ({ children }) => {
  const [asset, updateAsset] = useState<AssetType>();
  const from = useSelector(selectSelectedInternalAccount);
  const [to, updateTo] = useState<Hex>();
  const [value, updateValue] = useState<string>();

  return (
    <SendContext.Provider
      value={{
        asset,
        from: from?.address as Hex,
        to,
        updateAsset,
        updateTo,
        updateValue,
        value,
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
