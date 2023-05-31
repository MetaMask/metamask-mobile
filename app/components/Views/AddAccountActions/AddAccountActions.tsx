// Third party dependencies.
import React, { Fragment, useCallback, useState } from 'react';
import { Platform, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import AccountAction from '../AccountAction/AccountAction';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import AnalyticsV2 from '../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Logger from '../../../util/Logger';
import Engine from '../../../core/Engine';

// Internal dependencies
import { AddAccountActionsProps } from './AddAccountActions.types';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  ADD_ACCOUNT_NEW_ACCOUNT_BUTTON,
  ADD_ACCOUNT_IMPORT_ACCOUNT_BUTTON,
} from '../../../../wdio/screen-objects/testIDs/Components/AddAccountModal.testIds';

const AddAccountActions = ({ onBack }: AddAccountActionsProps) => {
  const { navigate } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const openImportAccount = useCallback(() => {
    navigate('ImportPrivateKeyView');
    onBack();
    AnalyticsV2.trackEvent(MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT, {});
  }, [navigate, onBack]);

  const openConnectHardwareWallet = useCallback(() => {
    navigate('ConnectQRHardwareFlow');
    onBack();
    AnalyticsV2.trackEvent(MetaMetricsEvents.CONNECT_HARDWARE_WALLET, {});
  }, [onBack, navigate]);

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
      onBack();

      setIsLoading(false);
    }
  }, [onBack, setIsLoading]);

  return (
    <Fragment>
      <SheetHeader
        title={strings('account_actions.add_account')}
        onBack={onBack}
      />
      <View>
        <AccountAction
          actionTitle={strings('account_actions.add_new_account')}
          iconName={IconName.Add}
          onPress={createNewAccount}
          disabled={isLoading}
          {...generateTestId(Platform, ADD_ACCOUNT_NEW_ACCOUNT_BUTTON)}
        />
        <AccountAction
          actionTitle={strings('account_actions.import_account')}
          iconName={IconName.Import}
          onPress={openImportAccount}
          disabled={isLoading}
          {...generateTestId(Platform, ADD_ACCOUNT_IMPORT_ACCOUNT_BUTTON)}
        />
        <AccountAction
          actionTitle={strings('account_actions.add_hardware_wallet')}
          iconName={IconName.Hardware}
          onPress={openConnectHardwareWallet}
          disabled={isLoading}
        />
      </View>
    </Fragment>
  );
};

export default AddAccountActions;
