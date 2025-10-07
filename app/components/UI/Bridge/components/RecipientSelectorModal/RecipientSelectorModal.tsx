import React, { useMemo } from 'react';
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
} from '../../../../../core/redux/slices/bridge/index.ts';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import {
  selectAccountToGroupMap,
  selectAccountGroupsByWallet,
} from '../../../../../selectors/multichainAccounts/accountTreeController.ts';

const RecipientSelectorModal: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
  const accountGroupsByWallet = useSelector(selectAccountGroupsByWallet);
  const destToken = useSelector(selectDestToken);
  const destAddress = useSelector(selectDestAddress);

  const handleClose = () => {
    navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
    });
  };

  const handleSelectAccount = (accountGroup: AccountGroupObject) => {
    const destScope = formatChainIdToCaip(destToken?.chainId || '');
    const internalAccountId = accountGroup.accounts.find((account) =>
      internalAccountsById[account].scopes.includes(destScope),
    );
    if (internalAccountId) {
      const internalAccount = internalAccountsById[internalAccountId];
      dispatch(setDestAddress(internalAccount.address));
      navigation.goBack();
    }
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

    const destScope = formatChainIdToCaip(destToken.chainId);

    return accountGroupsByWallet.reduce<AccountSection[]>((acc, section) => {
      // Filter account groups to only include those with accounts supporting destScope
      const filteredGroups = section.data.filter((accountGroup) =>
        // Filter accounts within the group to only those supporting destScope
         accountGroup.accounts.some((accountId) => {
          const isWildcardEvmScope = destScope.startsWith('eip155:');
          if (isWildcardEvmScope) {
            return internalAccountsById[accountId]?.scopes.some((scope) =>
              scope.startsWith('eip155:'),
            );
          }
          return internalAccountsById[accountId]?.scopes.includes(destScope);
        })
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
  }, [destToken, accountGroupsByWallet, internalAccountsById]);

  const selectedAccountGroup = useMemo(() => {
    if (!destAddress) return undefined;

    // Find the internal account that matches the destAddress
    const internalAccountId = Object.keys(internalAccountsById).find(
      (accountId) => internalAccountsById[accountId].address === destAddress,
    );

    // Use the account ID to get the account group from the map
    return internalAccountId ? accountToGroupMap[internalAccountId] : undefined;
  }, [destAddress, internalAccountsById, accountToGroupMap]);

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
      />
    </BottomSheet>
  );
};

export default RecipientSelectorModal;
