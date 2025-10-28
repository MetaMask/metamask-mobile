import React, { useCallback, useMemo, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import MultichainAccountSelectorList from '../../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/MultichainAccountSelectorList.tsx';
import { AccountSection } from '../../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/MultichainAccountSelectorList.types';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController.ts';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectDestAddress,
  selectDestToken,
  setDestAddress,
  setIsSelectingRecipient,
} from '../../../../../core/redux/slices/bridge/index.ts';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import {
  selectAccountToGroupMap,
  selectAccountGroupsByWallet,
} from '../../../../../selectors/multichainAccounts/accountTreeController.ts';
import { EthScope } from '@metamask/keyring-api';
import { KnownCaipNamespace } from '@metamask/utils';
import { AccountId } from '@metamask/accounts-controller';
import Engine from '../../../../../core/Engine';

const RecipientSelectorModal: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
  const accountGroupsByWallet = useSelector(selectAccountGroupsByWallet);
  const destToken = useSelector(selectDestToken);
  const destAddress = useSelector(selectDestAddress);

  const destScope = formatChainIdToCaip(destToken?.chainId || '');
  const isDestEvm = destScope.startsWith(KnownCaipNamespace.Eip155);

  useEffect(() => {
    // Set selecting recipient state to prevent quote refresh and expired modal
    dispatch(setIsSelectingRecipient(true));

    // Stop polling when modal opens
    if (Engine.context.BridgeController?.stopAllPolling) {
      Engine.context.BridgeController.stopAllPolling();
    }

    // Reset state when modal closes
    return () => {
      dispatch(setIsSelectingRecipient(false));
    };
  }, [dispatch]);

  const handleClose = () => {
    navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
    });
  };

  const getIsAccountSupported = useCallback(
    (account: AccountId) => {
      const byDestScope =
        internalAccountsById[account]?.scopes.includes(destScope);
      const byEvmWildcard = isDestEvm
        ? internalAccountsById[account]?.scopes.includes(EthScope.Eoa)
        : false;
      return byDestScope || byEvmWildcard;
    },
    [internalAccountsById, destScope, isDestEvm],
  );

  const handleSelectAccount = (accountGroup: AccountGroupObject) => {
    const internalAccountId = accountGroup.accounts.find((accountId) =>
      getIsAccountSupported(accountId),
    );
    if (internalAccountId) {
      const internalAccount = internalAccountsById[internalAccountId];
      dispatch(setDestAddress(internalAccount.address));
      navigation.goBack();
    }
  };

  const handleSelectExternalAccount = (address: string) => {
    dispatch(setDestAddress(address));
    navigation.goBack();
  };

  // Filter account sections to only include accounts that support the destScope
  const filteredAccountSections = useMemo(() => {
    if (
      !destToken?.chainId ||
      !accountGroupsByWallet ||
      !internalAccountsById
    ) {
      return undefined;
    }

    return accountGroupsByWallet.reduce<AccountSection[]>((acc, section) => {
      // Filter account groups to only include those with accounts supporting destScope
      const filteredGroups = section.data.filter((accountGroup) =>
        // Filter accounts within the group to only those supporting destScope
        accountGroup.accounts.some((accountId) =>
          getIsAccountSupported(accountId),
        ),
      );

      // Only include the wallet section if it has at least one group with supported accounts
      if (filteredGroups.length > 0) {
        acc.push({
          title: section.title,
          wallet: section.wallet,
          data: filteredGroups,
        });
      }

      return acc;
    }, []);
  }, [
    destToken,
    accountGroupsByWallet,
    internalAccountsById,
    getIsAccountSupported,
  ]);

  const selectedAccountGroup = useMemo(() => {
    if (!destAddress) return undefined;

    // Find the internal account that matches the destAddress
    const internalAccountId = Object.keys(internalAccountsById).find(
      (accountId) => internalAccountsById[accountId].address === destAddress,
    );

    // Use the account ID to get the account group from the map
    return internalAccountId ? accountToGroupMap[internalAccountId] : undefined;
  }, [destAddress, internalAccountsById, accountToGroupMap]);

  // Determine if destAddress is an external address (not in user's accounts)
  const selectedExternalAddress = useMemo(() => {
    if (!destAddress) return undefined;

    // Check if the address belongs to any of the user's accounts
    const isInternalAccount = Object.values(internalAccountsById).some(
      (account) => account.address.toLowerCase() === destAddress.toLowerCase(),
    );

    // Only return the address if it's external (not in user's accounts)
    return isInternalAccount ? undefined : destAddress;
  }, [destAddress, internalAccountsById]);

  return (
    <BottomSheet onClose={handleClose} keyboardAvoidingViewEnabled>
      <BottomSheetHeader onBack={handleClose} onClose={handleClose}>
        Recipient account
      </BottomSheetHeader>
      <MultichainAccountSelectorList
        selectedAccountGroups={
          selectedAccountGroup ? [selectedAccountGroup] : []
        }
        showFooter={false}
        onSelectAccount={handleSelectAccount}
        accountSections={filteredAccountSections}
        chainId={destToken?.chainId}
        hideAccountCellMenu
        showExternalAccountOnEmptySearch
        onSelectExternalAccount={handleSelectExternalAccount}
        selectedExternalAddress={selectedExternalAddress}
      />
    </BottomSheet>
  );
};

export default RecipientSelectorModal;
