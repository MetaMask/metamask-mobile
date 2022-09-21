// Third party dependencies.
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import SheetActions from '../../../../component-library/components-temp/SheetActions';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import AccountSelectorList from '../../../../components/UI/AccountSelectorList';
import { strings } from '../../../../../locales/i18n';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';
import { AccountConnectScreens } from '../AccountConnect.types';

// Internal dependencies.
import { AccountConnectSingleSelectorProps } from './AccountConnectSingleSelector.types';
import styles from './AccountConnectSingleSelector.styles';

const AccountConnectSingleSelector = ({
  accounts,
  ensByAccountAddress,
  selectedAddresses,
  isLoading,
  onCreateAccount,
  onDismissSheetWithCallback,
  onSetScreen,
  onSetSelectedAddresses,
}: AccountConnectSingleSelectorProps) => {
  const navigation = useNavigation();

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

  const onOpenImportAccount = useCallback(() => {
    onDismissSheetWithCallback(() => {
      navigation.navigate('ImportPrivateKeyView');
      // Is this where we want to track importing an account or within ImportPrivateKeyView screen?
      AnalyticsV2.trackEvent(
        ANALYTICS_EVENT_OPTS.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
      );
    });
  }, [navigation, onDismissSheetWithCallback]);

  const onOpenConnectHardwareWallet = useCallback(() => {
    onDismissSheetWithCallback(() => {
      navigation.navigate('ConnectQRHardwareFlow');
      // Is this where we want to track connecting a hardware wallet or within ConnectQRHardwareFlow screen?
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.CONNECT_HARDWARE_WALLET,
      );
    });
  }, [navigation, onDismissSheetWithCallback]);

  const renderSheetActions = useCallback(
    () => (
      <View style={styles.sheetActionContainer}>
        <SheetActions
          actions={[
            {
              label: strings('accounts.create_new_account'),
              onPress: onCreateAccount,
              isLoading,
            },
            {
              label: strings('accounts.import_account'),
              onPress: onOpenImportAccount,
              disabled: isLoading,
            },
            {
              label: strings('accounts.connect_hardware'),
              onPress: onOpenConnectHardwareWallet,
              disabled: isLoading,
            },
          ]}
        />
      </View>
    ),
    [
      isLoading,
      onCreateAccount,
      onOpenImportAccount,
      onOpenConnectHardwareWallet,
    ],
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
