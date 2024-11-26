// Third party dependencies.
import React, { Fragment, useCallback, useState } from 'react';
import { SafeAreaView, View } from 'react-native';
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
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isLoading, setIsLoading] = useState(false);

  const openImportAccount = useCallback(() => {
    navigate('ImportPrivateKeyView');
    onBack();
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
      ).build(),
    );
  }, [navigate, onBack, trackEvent, createEventBuilder]);

  const openConnectHardwareWallet = useCallback(() => {
    navigate(Routes.HW.CONNECT);
    onBack();
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CONNECT_HARDWARE_WALLET).build(),
    );
  }, [onBack, navigate, trackEvent, createEventBuilder]);

  const createNewAccount = useCallback(async () => {
    const { KeyringController } = Engine.context;
    try {
      setIsLoading(true);

      const addedAccountAddress = await KeyringController.addNewAccount();
      Engine.setSelectedAddress(addedAccountAddress);
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.ACCOUNTS_ADDED_NEW_ACCOUNT,
        ).build(),
      );
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      Logger.error(e, 'error while trying to add a new account');
    } finally {
      onBack();

      setIsLoading(false);
    }
  }, [onBack, setIsLoading, trackEvent, createEventBuilder]);

  return (
    <SafeAreaView>
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
    </SafeAreaView>
  );
};

export default AddAccountActions;
