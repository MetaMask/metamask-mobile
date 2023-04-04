// Third party dependencies.
import React, { useCallback, useRef, useState } from 'react';
import { InteractionManager, Platform, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import AccountSelectorList from '../../UI/AccountSelectorList';
import SheetActions from '../../../component-library/components-temp/SheetActions';
import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import UntypedEngine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import AnalyticsV2 from '../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { strings } from '../../../../locales/i18n';
import { useAccounts } from '../../hooks/useAccounts';
import generateTestId from '../../../../wdio/utils/generateTestId';
// Internal dependencies.
import {
  ACCOUNT_LIST_ID,
  CREATE_ACCOUNT_BUTTON_ID,
  IMPORT_ACCOUNT_BUTTON_ID,
} from './AccountSelector.constants';
import { AccountSelectorProps } from './AccountSelector.types';
import styles from './AccountSelector.styles';

const AccountSelector = ({ route }: AccountSelectorProps) => {
  const {
    onCreateNewAccount,
    onOpenImportAccount,
    onOpenConnectHardwareWallet,
    onSelectAccount,
    checkBalanceError,
    isSelectOnly,
  } = route.params || {};
  const Engine = UntypedEngine as any;
  const [isLoading, setIsLoading] = useState(false);
  const sheetRef = useRef<SheetBottomRef>(null);
  const navigation = useNavigation();
  const { accounts, ensByAccountAddress } = useAccounts({
    checkBalanceError,
    isLoading,
  });

  const _onSelectAccount = (address: string) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setSelectedAddress(address);
    sheetRef.current?.hide();
    onSelectAccount?.(address);
    InteractionManager.runAfterInteractions(() => {
      // Track Event: "Switched Account"
      AnalyticsV2.trackEvent(MetaMetricsEvents.SWITCHED_ACCOUNT, {
        source: 'Wallet Tab',
        number_of_accounts: accounts?.length,
      });
    });
  };

  const onRemoveImportedAccount = useCallback(
    ({ nextActiveAddress }: { nextActiveAddress: string }) => {
      const { PreferencesController } = Engine.context;
      nextActiveAddress &&
        PreferencesController.setSelectedAddress(nextActiveAddress);
    },
    [Engine.context],
  );

  const createNewAccount = useCallback(async () => {
    const { KeyringController, PreferencesController } = Engine.context;
    try {
      setIsLoading(true);
      const { addedAccountAddress } = await KeyringController.addNewAccount();
      PreferencesController.setSelectedAddress(addedAccountAddress);
      AnalyticsV2.trackEvent(MetaMetricsEvents.ACCOUNTS_ADDED_NEW_ACCOUNT, {});
    } catch (e: any) {
      Logger.error(e, 'error while trying to add a new account');
    } finally {
      setIsLoading(false);
    }
    onCreateNewAccount?.();
    /* eslint-disable-next-line */
  }, [onCreateNewAccount, setIsLoading]);

  const openImportAccount = useCallback(() => {
    navigation.navigate('ImportPrivateKeyView');
    // Is this where we want to track importing an account or within ImportPrivateKeyView screen?
    AnalyticsV2.trackEvent(MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT, {});
    onOpenImportAccount?.();
  }, [onOpenImportAccount, navigation]);

  const openConnectHardwareWallet = useCallback(() => {
    navigation.navigate('ConnectQRHardwareFlow');
    // Is this where we want to track connecting a hardware wallet or within ConnectQRHardwareFlow screen?
    AnalyticsV2.trackEvent(MetaMetricsEvents.CONNECT_HARDWARE_WALLET, {});
    onOpenConnectHardwareWallet?.();
  }, [onOpenConnectHardwareWallet, navigation]);

  const renderSheetActions = useCallback(
    () =>
      !isSelectOnly && (
        <SheetActions
          actions={[
            {
              label: strings('accounts.create_new_account'),
              onPress: createNewAccount,
              testID: CREATE_ACCOUNT_BUTTON_ID,
              isLoading,
            },
            {
              label: strings('accounts.import_account'),
              onPress: openImportAccount,
              testID: IMPORT_ACCOUNT_BUTTON_ID,
              disabled: isLoading,
            },
            {
              label: strings('accounts.connect_hardware'),
              onPress: openConnectHardwareWallet,
              disabled: isLoading,
            },
          ]}
        />
      ),
    [
      isSelectOnly,
      isLoading,
      createNewAccount,
      openImportAccount,
      openConnectHardwareWallet,
    ],
  );

  return (
    <SheetBottom ref={sheetRef}>
      <SheetHeader title={strings('accounts.accounts_title')} />
      <AccountSelectorList
        onSelectAccount={_onSelectAccount}
        onRemoveImportedAccount={onRemoveImportedAccount}
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        isLoading={isLoading}
        isRemoveAccountEnabled
        {...generateTestId(Platform, ACCOUNT_LIST_ID)}
      />
      <View style={styles.sheet}>{renderSheetActions()}</View>
    </SheetBottom>
  );
};

export default AccountSelector;
