// Third party dependencies.
import React, { useCallback } from 'react';
import { View } from 'react-native';

// External dependencies.
import SheetActions from '../../../../component-library/components-temp/SheetActions';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import AccountSelectorList from '../../../../components/UI/AccountSelectorList';
import { strings } from '../../../../../locales/i18n';
import { AccountConnectScreens } from '../AccountConnect.types';

// Internal dependencies.
import { AccountConnectSingleSelectorProps } from './AccountConnectSingleSelector.types';
import styles from './AccountConnectSingleSelector.styles';
import USER_INTENT from '../../../../constants/permissions';

const AccountConnectSingleSelector = ({
  accounts,
  ensByAccountAddress,
  selectedAddresses,
  isLoading,
  onSetScreen,
  onSetSelectedAddresses,
  onUserAction,
}: AccountConnectSingleSelectorProps) => {
  const onBack = useCallback(
    () => onSetScreen(AccountConnectScreens.SingleConnect),
    [onSetScreen],
  );

  const onSelectAccount = useCallback(
    (address: string) => {
      onSetScreen(AccountConnectScreens.SingleConnect);
      onSetSelectedAddresses([address]);
    },
    [onSetScreen, onSetSelectedAddresses],
  );

  const renderSheetActions = useCallback(
    () => (
      <View style={styles.sheetActionContainer}>
        <SheetActions
          actions={[
            {
              label: strings('accounts.create_new_account'),
              onPress: () => onUserAction(USER_INTENT.Create),
              isLoading,
            },
            {
              label: strings('accounts.import_account'),
              onPress: () => onUserAction(USER_INTENT.Import),
              disabled: isLoading,
            },
            {
              label: strings('accounts.connect_hardware'),
              onPress: () => onUserAction(USER_INTENT.ConnectHW),
              disabled: isLoading,
            },
          ]}
        />
      </View>
    ),
    [isLoading, onUserAction],
  );

  return (
    <>
      <SheetHeader onBack={onBack} title={strings('accounts.accounts_title')} />
      <AccountSelectorList
        onSelectAccount={onSelectAccount}
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        isLoading={isLoading}
        selectedAddresses={selectedAddresses}
      />
      {renderSheetActions()}
    </>
  );
};

export default AccountConnectSingleSelector;
