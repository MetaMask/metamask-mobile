// Third party dependencies.
import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import AccountAction from '../AccountAction/AccountAction';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../../component-library/hooks';
import AnalyticsV2 from '../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Logger from '../../../util/Logger';
import Engine from '../../../core/Engine';
import { useParams } from '../../../util/navigation/navUtils';

// Internal dependencies
import styleSheet from './AddAccountActions.styles';
import { AddAccountActionsParams } from './AddAccountActions.types';

const AddAccountActions = () => {
  const { navigate } = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<SheetBottomRef>(null);
  const { isLoading, setIsLoading } = useParams<AddAccountActionsParams>();

  const openImportAccount = useCallback(() => {
    sheetRef.current?.hide(async () => {
      navigate('ImportPrivateKeyView');
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
        {},
      );
    });
  }, [navigate]);

  const openConnectHardwareWallet = useCallback(() => {
    sheetRef.current?.hide(async () => {
      navigate('ConnectQRHardwareFlow');
      AnalyticsV2.trackEvent(MetaMetricsEvents.CONNECT_HARDWARE_WALLET, {});
    });
  }, [navigate]);

  const createNewAccount = useCallback(() => {
    sheetRef.current?.hide(async () => {
      const { KeyringController, PreferencesController } = Engine.context;
      try {
        setIsLoading?.(true);
        const { addedAccountAddress } = await KeyringController.addNewAccount();
        PreferencesController.setSelectedAddress(addedAccountAddress);
        AnalyticsV2.trackEvent(
          MetaMetricsEvents.ACCOUNTS_ADDED_NEW_ACCOUNT,
          {},
        );
      } catch (e: any) {
        Logger.error(e, 'error while trying to add a new account');
      } finally {
        setIsLoading?.(false);
      }
    });
  }, [setIsLoading]);

  return (
    <SheetBottom ref={sheetRef}>
      <SheetHeader
        title={strings('account_actions.add_account')}
        onBack={() => sheetRef.current?.hide()}
      />
      <View style={styles.actionsContainer}>
        <AccountAction
          actionTitle={strings('account_actions.add_new_account')}
          iconName={IconName.Add}
          onPress={createNewAccount}
          disabled={isLoading}
        />
        <AccountAction
          actionTitle={strings('account_actions.import_account')}
          iconName={IconName.Import}
          onPress={openImportAccount}
          disabled={isLoading}
        />
        <AccountAction
          actionTitle={strings('account_actions.add_hardware_wallet')}
          iconName={IconName.Hardware}
          onPress={openConnectHardwareWallet}
          disabled={isLoading}
        />
      </View>
    </SheetBottom>
  );
};

export default AddAccountActions;
