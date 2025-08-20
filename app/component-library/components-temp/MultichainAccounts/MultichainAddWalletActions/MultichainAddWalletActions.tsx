import React, { Fragment, useCallback } from 'react';
import { SafeAreaView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import AccountAction from '../../../../components/Views/AccountAction/AccountAction';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';

import { MultichainAddWalletActionsProps } from './MultichainAddWalletActions.types';
import { AddAccountBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/wallet/AddAccountBottomSheet.selectors';
import Routes from '../../../../constants/navigation/Routes';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import { useStyles } from '../../../../components/hooks/useStyles';
import styleSheet from './MultichainAddWalletActions.styles';

const MultichainAddWalletActions = ({
  onBack,
}: MultichainAddWalletActionsProps) => {
  const { navigate } = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();

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

  const openImportSrp = useCallback(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_CLICKED,
      ).build(),
    );
    navigate(Routes.MULTI_SRP.IMPORT);
    onBack();
  }, [onBack, navigate, trackEvent, createEventBuilder]);

  return (
    <SafeAreaView>
      <Fragment>
        <SheetHeader title={strings('multichain_accounts.add_wallet')} />
        <View>
          {/* TODO: Uncomment when adding new SRP will be implemented */}
          {/* <AccountAction
            actionTitle={strings('account_actions.create_new_wallet')}
            iconName={IconName.Add}
            onPress={() => {
              // TODO: add action for "Create a new wallet"
            }}
            disabled={false}
            testID={
              AddAccountBottomSheetSelectorsIDs.ADD_ETHEREUM_ACCOUNT_BUTTON
            }
            style={styles.accountAction}
          /> */}
          <AccountAction
            actionTitle={strings('account_actions.import_wallet')}
            iconName={IconName.Wallet}
            onPress={openImportSrp}
            testID={AddAccountBottomSheetSelectorsIDs.IMPORT_SRP_BUTTON}
            style={styles.accountAction}
          />
          <AccountAction
            actionTitle={strings('accounts.import_account')}
            iconName={IconName.Download}
            onPress={openImportAccount}
            testID={AddAccountBottomSheetSelectorsIDs.IMPORT_ACCOUNT_BUTTON}
            style={styles.accountAction}
          />
          <AccountAction
            actionTitle={strings('multichain_accounts.add_hardware_wallet')}
            iconName={IconName.Usb}
            onPress={openConnectHardwareWallet}
            testID={
              AddAccountBottomSheetSelectorsIDs.ADD_HARDWARE_WALLET_BUTTON
            }
            style={styles.accountAction}
          />
        </View>
      </Fragment>
    </SafeAreaView>
  );
};

export default MultichainAddWalletActions;
