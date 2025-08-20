import { InternalAccount } from '@metamask/keyring-internal-api';
import React, {
  ReactElement,
  createContext,
  useContext,
  useState,
} from 'react';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { toHex } from '@metamask/controller-utils';

import { AssetType } from '../../types/token';

export interface SendContextType {
  asset?: AssetType;
  chainId?: string;
  fromAccount?: InternalAccount;
  from?: string;
  to?: string;
  updateAsset: (asset?: AssetType) => void;
  updateFromAccount: (fromAccount?: InternalAccount) => void;
  updateTo: (to: string) => void;
  updateValue: (value: string) => void;
  value?: string;
}

export const SendContext = createContext<SendContextType>({
  asset: undefined,
  chainId: undefined,
  fromAccount: {} as InternalAccount,
  from: '',
  to: undefined,
  updateAsset: () => undefined,
  updateFromAccount: () => undefined,
  updateTo: () => undefined,
  updateValue: () => undefined,
  value: undefined,
});

export const SendContextProvider: React.FC<{
  children: ReactElement[] | ReactElement;
}> = ({ children }) => {
  const [asset, updateAsset] = useState<AssetType>();
  const [to, updateTo] = useState<string>();
  const [value, updateValue] = useState<string>();
  const [fromAccount, updateFromAccount] = useState<InternalAccount>();
  const chainId =
    asset && isEvmAddress(asset.address) && asset.chainId
      ? toHex(asset.chainId)
      : asset?.chainId;

  return (
    <SendContext.Provider
      value={{
        asset,
        chainId: chainId as string | undefined,
        fromAccount,
        from: fromAccount?.address as string,
        to,
        updateAsset,
        updateFromAccount,
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
