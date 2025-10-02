import React, { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import MultichainAccountSelectorList from '../../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/MultichainAccountSelectorList.tsx';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController.ts';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectDestAddress,
  selectDestToken,
  setDestAddress,
} from '../../../../../core/redux/slices/bridge/index.ts';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectAccountToGroupMap } from '../../../../../selectors/multichainAccounts/accountTreeController.ts';

const RecipientSelectorModal: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
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
      />
    </BottomSheet>
  );
};

export default RecipientSelectorModal;
