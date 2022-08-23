// Third party dependencies.
import React, { useCallback, useRef, useState } from 'react';
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
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { strings } from '../../../../locales/i18n';
import {
  ACCOUNT_LIST_ID,
  CREATE_ACCOUNT_BUTTON_ID,
  IMPORT_ACCOUNT_BUTTON_ID,
} from './AccountSelector.constants';

// Internal dependencies.
import { AccountSelectorProps } from './AccountSelector.types';

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

  const _onSelectAccount = (address: string) => {
    sheetRef.current?.hide();
    onSelectAccount?.(address);
  };

  const createNewAccount = useCallback(async () => {
    const { KeyringController } = Engine.context;
    try {
      setIsLoading(true);
      await KeyringController.addNewAccount();
      AnalyticsV2.trackEvent(ANALYTICS_EVENT_OPTS.ACCOUNTS_ADDED_NEW_ACCOUNT);
    } catch (e: any) {
      Logger.error(e, 'error while trying to add a new account');
    } finally {
      setIsLoading(false);
    }
    onCreateNewAccount?.();
    /* eslint-disable-next-line */
  }, [onCreateNewAccount, setIsLoading]);

  const openImportAccount = useCallback(() => {
    sheetRef.current?.hide(() => {
      navigation.navigate('ImportPrivateKeyView');
      // Is this where we want to track importing an account or within ImportPrivateKeyView screen?
      AnalyticsV2.trackEvent(
        ANALYTICS_EVENT_OPTS.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
      );
    });
    onOpenImportAccount?.();
  }, [onOpenImportAccount, navigation]);

  const openConnectHardwareWallet = useCallback(() => {
    sheetRef.current?.hide(() => {
      navigation.navigate('ConnectQRHardwareFlow');
      // Is this where we want to track connecting a hardware wallet or within ConnectQRHardwareFlow screen?
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.CONNECT_HARDWARE_WALLET,
      );
    });
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
      <SheetHeader title={strings('accounts.account_selector.title')} />
      <AccountSelectorList
        onSelectAccount={_onSelectAccount}
        checkBalanceError={checkBalanceError}
        key={ACCOUNT_LIST_ID}
        isLoading={isLoading}
      />
      {renderSheetActions()}
    </SheetBottom>
  );
};

export default AccountSelector;
