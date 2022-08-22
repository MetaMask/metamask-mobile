// Third party dependencies.
import React, { useRef, useState } from 'react';
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
import Loader from '../../../component-library/components-temp/Loader';

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

  const createNewAccount = async () => {
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
  };

  const openImportAccount = () => {
    sheetRef.current?.hide(() => {
      navigation.navigate('ImportPrivateKeyView');
      // Is this where we want to track importing an account or within ImportPrivateKeyView screen?
      AnalyticsV2.trackEvent(
        ANALYTICS_EVENT_OPTS.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
      );
    });
    onOpenImportAccount?.();
  };

  const openConnectHardwareWallet = () => {
    sheetRef.current?.hide(() => {
      navigation.navigate('ConnectQRHardwareFlow');
      // Is this where we want to track connecting a hardware wallet or within ConnectQRHardwareFlow screen?
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.CONNECT_HARDWARE_WALLET,
      );
    });
    onOpenConnectHardwareWallet?.();
  };

  return (
    <SheetBottom ref={sheetRef}>
      <SheetHeader title={'Accounts'} />
      <AccountSelectorList
        onSelectAccount={_onSelectAccount}
        checkBalanceError={checkBalanceError}
      />
      {!isSelectOnly && (
        <SheetActions
          actions={[
            { label: 'Create a new account', onPress: createNewAccount },
            { label: 'Import an account', onPress: openImportAccount },
            {
              label: 'Connect hardware wallet',
              onPress: openConnectHardwareWallet,
            },
          ]}
        />
      )}
      {isLoading && <Loader />}
    </SheetBottom>
  );
};

export default AccountSelector;
