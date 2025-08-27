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
import { isSolanaChainId } from '@metamask/bridge-controller';

import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { selectSelectedAccountGroup } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { AssetType, Nft } from '../../types/token';
import { isEvmAccountType } from '@metamask/keyring-api';
import { isSolanaAccount } from '../../../../../core/Multichain/utils';

export interface SendContextType {
  asset?: AssetType | Nft;
  chainId?: string;
  fromAccount?: InternalAccount;
  from?: string;
  to?: string;
  updateAsset: (asset?: AssetType | Nft) => void;
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
  const [asset, updateAsset] = useState<AssetType | Nft>();
  const [to, updateTo] = useState<string>();
  const [value, updateValue] = useState<string>();
  const [fromAccount, updateFromAccount] = useState<InternalAccount>();
  const accounts = useSelector(selectInternalAccountsById);
  const selectedGroup = useSelector(selectSelectedAccountGroup);

  const handleUpdateAsset = useCallback(
    (updatedAsset?: AssetType | Nft) => {
      updateAsset(updatedAsset);
      if (
        updatedAsset?.accountId &&
        updatedAsset.accountId !== fromAccount?.id
      ) {
        updateFromAccount(accounts[updatedAsset.accountId as string]);
      } else {
        // We don't have accountId in the updated asset - this is a navigation from outside of the send flow
        // Hence we need to update the fromAccount from the selected group
        const isEvmAsset = updatedAsset?.address
          ? isEvmAddress(updatedAsset.address)
          : undefined;
        const isSolanaAsset = updatedAsset?.chainId
          ? isSolanaChainId(updatedAsset.chainId)
          : undefined;

        const selectedAccountGroupAccounts = selectedGroup?.accounts.map(
          (accountId) => accounts[accountId],
        );

        if (isEvmAsset) {
          const evmAccount = selectedAccountGroupAccounts?.find((account) =>
            isEvmAccountType(account.type),
          );
          updateFromAccount(evmAccount);
        } else if (isSolanaAsset) {
          const solanaAccount = selectedAccountGroupAccounts?.find((account) =>
            isSolanaAccount(account),
          );
          updateFromAccount(solanaAccount);
        }
      }
    },
    [
      accounts,
      fromAccount?.id,
      updateAsset,
      updateFromAccount,
      selectedGroup?.accounts,
    ],
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
