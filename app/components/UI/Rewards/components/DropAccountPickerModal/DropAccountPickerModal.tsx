import React, { useCallback, useRef } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import BottomSheet, { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import MultichainAccountSelectorList from '../../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { strings } from '../../../../../../locales/i18n';
import { InteractionManager } from 'react-native';

interface DropAccountPickerParams {
  onSelectAccountGroup: (accountGroup: AccountGroupObject) => void;
}

type DropAccountPickerRouteProp = RouteProp<
  { params: DropAccountPickerParams },
  'params'
>;

const DropAccountPickerModal: React.FC = () => {
  const navigation = useNavigation();
  const ref = useRef<BottomSheetRef>(null);
  const route = useRoute<DropAccountPickerRouteProp>();
  const { onSelectAccountGroup } = route.params;

  const handleDismiss = useCallback(() => {
     ref.current?.onCloseBottomSheet();
  }, [navigation]);

  const handleSelectAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
    navigation.goBack();
    InteractionManager.runAfterInteractions(() => {
      onSelectAccountGroup(accountGroup);
    });
  }, [onSelectAccountGroup, navigation]);

  return (
    <BottomSheet
      ref={ref}
      shouldNavigateBack={false}
      onClose={handleDismiss}
    >
      <BottomSheetHeader onBack={handleDismiss}>
        {strings('accounts.accounts_title')}
      </BottomSheetHeader>
      <MultichainAccountSelectorList
        onSelectAccount={handleSelectAccount}
        selectedAccountGroups={[]}
        showFooter={false}
        hideAccountCellMenu
        testID="drop-account-picker-list"
      />
    </BottomSheet>
  );
};

export default DropAccountPickerModal;
