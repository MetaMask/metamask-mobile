import { InternalAccount } from '@metamask/keyring-internal-api';
import React, {
  ReactElement,
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useSelector } from 'react-redux';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { toHex } from '@metamask/controller-utils';

import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { selectSelectedAccountGroup } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { AssetType, Nft } from '../../types/token';
import { AssetProtocol, PROTOCOL_CONFIG } from '../../constants/protocol';

export interface SendContextType {
  asset?: AssetType | Nft;
  chainId?: string;
  fromAccount?: InternalAccount;
  from?: string;
  maxValueMode: boolean;
  submitError?: string;
  to?: string;
  updateAsset: (asset?: AssetType | Nft) => void;
  updateSubmitError: (error: string | undefined) => void;
  updateTo: (to: string) => void;
  updateValue: (value: string, maxMode?: boolean) => void;
  value?: string;
}

export const SendContext = createContext<SendContextType>({
  asset: undefined,
  chainId: undefined,
  fromAccount: {} as InternalAccount,
  from: '',
  maxValueMode: false,
  submitError: undefined,
  to: undefined,
  updateAsset: () => undefined,
  updateSubmitError: () => undefined,
  updateTo: () => undefined,
  updateValue: () => undefined,
  value: undefined,
});

export const SendContextProvider: React.FC<{
  children: ReactElement[] | ReactElement;
}> = ({ children }) => {
  const [asset, updateAsset] = useState<AssetType | Nft>();
  const [submitError, updateSubmitError] = useState<string>();
  const [to, setTo] = useState<string>();
  const [maxValueMode, setMaxValueMode] = useState(false);
  const [value, setValue] = useState<string>();
  const [fromAccount, updateFromAccount] = useState<InternalAccount>();
  const accounts = useSelector(selectInternalAccountsById);
  const selectedGroup = useSelector(selectSelectedAccountGroup);

  const updateValue = useCallback(
    (val: string, maxMode?: boolean) => {
      setMaxValueMode(maxMode ?? false);
      setValue(val);
      // Clear submit error when user changes amount
      updateSubmitError(undefined);
    },
    [setMaxValueMode, setValue],
  );

  const updateTo = useCallback(
    (newTo: string) => {
      setTo(newTo);
      // Clear submit error when user changes recipient
      updateSubmitError(undefined);
    },
    [setTo],
  );

  const handleUpdateAsset = useCallback(
    (updatedAsset?: AssetType | Nft) => {
      updateValue('', false);
      updateAsset(updatedAsset);
      if (
        updatedAsset?.accountId &&
        updatedAsset.accountId !== fromAccount?.id
      ) {
        updateFromAccount(accounts[updatedAsset.accountId as string]);
      } else {
        // We don't have accountId in the updated asset - this is a navigation from outside of the send flow
        // Hence we need to update the fromAccount from the selected group
        const selectedAccountGroupAccounts = selectedGroup?.accounts.map(
          (accountId) => accounts[accountId],
        );

        for (const protocol of Object.values(AssetProtocol)) {
          const config = PROTOCOL_CONFIG[protocol];
          if (updatedAsset && config.isAssetType(updatedAsset)) {
            const account = selectedAccountGroupAccounts?.find((acc) =>
              config.isAccountType(acc),
            );
            updateFromAccount(account);
            break;
          }
        }
      }
    },
    [
      accounts,
      fromAccount?.id,
      updateValue,
      updateAsset,
      updateFromAccount,
      selectedGroup?.accounts,
    ],
  );

  const chainId =
    asset && isEvmAddress(asset.address) && asset.chainId
      ? toHex(asset.chainId)
      : asset?.chainId;

  const contextValue = useMemo(
    () => ({
      asset,
      chainId: chainId as string | undefined,
      fromAccount,
      from: fromAccount?.address as string,
      maxValueMode,
      submitError,
      to,
      updateAsset: handleUpdateAsset,
      updateSubmitError,
      updateTo,
      updateValue,
      value,
    }),
    [
      asset,
      chainId,
      fromAccount,
      maxValueMode,
      submitError,
      to,
      handleUpdateAsset,
      updateTo,
      updateValue,
      value,
    ],
  );

  return (
    <SendContext.Provider value={contextValue}>{children}</SendContext.Provider>
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
