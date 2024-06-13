// Third party dependencies.
import React, { Fragment, useCallback, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import AccountAction from '../AccountAction/AccountAction';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Logger from '../../../util/Logger';
import Engine from '../../../core/Engine';

// Internal dependencies
import { AddAccountActionsProps } from './AddAccountActions.types';
import { AddAccountModalSelectorsIDs } from '../../../../e2e/selectors/Modals/AddAccountModal.selectors';
import Routes from '../../../constants/navigation/Routes';
import { useMetrics } from '../../../components/hooks/useMetrics';

const AddAccountActions = ({ onBack }: AddAccountActionsProps) => {
  const { navigate } = useNavigation();
  const { trackEvent } = useMetrics();
  const [isLoading, setIsLoading] = useState(false);

  const openImportAccount = useCallback(() => {
    navigate('ImportPrivateKeyView');
    onBack();
    trackEvent(MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT, {});
  }, [navigate, onBack, trackEvent]);

  const openConnectHardwareWallet = useCallback(() => {
    navigate(Routes.HW.CONNECT);
    onBack();
    trackEvent(MetaMetricsEvents.CONNECT_HARDWARE_WALLET, {});
  }, [onBack, navigate, trackEvent]);

  const createNewAccount = useCallback(async () => {
    const { KeyringController } = Engine.context;
    try {
      setIsLoading(true);

      const addedAccountAddress = await KeyringController.addNewAccount();
      Engine.setSelectedAddress(addedAccountAddress);
      trackEvent(MetaMetricsEvents.ACCOUNTS_ADDED_NEW_ACCOUNT, {});
    } catch (e: any) {
      Logger.error(e, 'error while trying to add a new account');
    } finally {
      onBack();

      setIsLoading(false);
    }
  }, [onBack, setIsLoading, trackEvent]);

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
          testID={AddAccountModalSelectorsIDs.NEW_ACCOUNT_BUTTON}
        />
        <AccountAction
          actionTitle={strings('account_actions.import_account')}
          iconName={IconName.Import}
          onPress={openImportAccount}
          disabled={isLoading}
          testID={AddAccountModalSelectorsIDs.IMPORT_ACCOUNT_BUTTON}
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
