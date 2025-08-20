import { InternalAccount } from '@metamask/keyring-internal-api';
import React, {
  ReactElement,
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';
import { useSelector } from 'react-redux';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { toHex } from '@metamask/controller-utils';

import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { AssetType } from '../../types/token';

export interface SendContextType {
  asset?: AssetType;
  chainId?: string;
  fromAccount?: InternalAccount;
  from?: string;
  to?: string;
  updateAsset: (asset?: AssetType) => void;
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
  const accounts = useSelector(selectInternalAccountsById);

  const handleUpdateAsset = useCallback(
    (updatedAsset?: AssetType) => {
      updateAsset(updatedAsset);
      if (
        updatedAsset?.accountId &&
        updatedAsset.accountId !== fromAccount?.id
      ) {
        updateFromAccount(accounts[updatedAsset.accountId as string]);
      }
    },
    [accounts, fromAccount?.id, updateAsset, updateFromAccount],
  );

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
        updateAsset: handleUpdateAsset,
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
