// Third party dependencies.
import React, { Fragment, useCallback, useRef, useState } from 'react';
import { InteractionManager, Platform, View } from 'react-native';

// External dependencies.
import AccountSelectorList from '../../UI/AccountSelectorList';
import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import UntypedEngine from '../../../core/Engine';
import AnalyticsV2 from '../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { strings } from '../../../../locales/i18n';
import { useAccounts } from '../../hooks/useAccounts';
import generateTestId from '../../../../wdio/utils/generateTestId';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import AddAccountActions from '../AddAccountActions';
import {
  ACCOUNT_LIST_ID,
  ACCOUNT_LIST_ADD_BUTTON_ID,
} from '../../../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';

// Internal dependencies.
import {
  AccountSelectorProps,
  AccountSelectorScreens,
} from './AccountSelector.types';
import styles from './AccountSelector.styles';

const AccountSelector = ({ route }: AccountSelectorProps) => {
  const { onSelectAccount, checkBalanceError } = route.params || {};
  const Engine = UntypedEngine as any;
  const sheetRef = useRef<SheetBottomRef>(null);
  const { accounts, ensByAccountAddress } = useAccounts({
    checkBalanceError,
  });
  const [screen, setScreen] = useState<AccountSelectorScreens>(
    AccountSelectorScreens.AccountSelector,
  );

  const _onSelectAccount = useCallback(
    (address: string) => {
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
    },
    [Engine.context, accounts?.length, onSelectAccount],
  );

  const onRemoveImportedAccount = useCallback(
    ({ nextActiveAddress }: { nextActiveAddress: string }) => {
      const { PreferencesController } = Engine.context;
      nextActiveAddress &&
        PreferencesController.setSelectedAddress(nextActiveAddress);
    },
    [Engine.context],
  );

  const renderAccountSelector = useCallback(
    () => (
      <Fragment>
        <SheetHeader title={strings('accounts.accounts_title')} />
        <AccountSelectorList
          onSelectAccount={_onSelectAccount}
          onRemoveImportedAccount={onRemoveImportedAccount}
          accounts={accounts}
          ensByAccountAddress={ensByAccountAddress}
          isRemoveAccountEnabled
          {...generateTestId(Platform, ACCOUNT_LIST_ID)}
        />
        <View style={styles.sheet}>
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('account_actions.add_account_or_hardware_wallet')}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            onPress={() => setScreen(AccountSelectorScreens.AddAccountActions)}
            {...generateTestId(Platform, ACCOUNT_LIST_ADD_BUTTON_ID)}
          />
        </View>
      </Fragment>
    ),
    [accounts, _onSelectAccount, ensByAccountAddress, onRemoveImportedAccount],
  );

  const renderAddAccountActions = useCallback(
    () => (
      <AddAccountActions
        onBack={() => setScreen(AccountSelectorScreens.AccountSelector)}
      />
    ),
    [],
  );

  const renderAccountScreens = useCallback(() => {
    switch (screen) {
      case AccountSelectorScreens.AccountSelector:
        return renderAccountSelector();
      case AccountSelectorScreens.AddAccountActions:
        return renderAddAccountActions();
      default:
        return renderAccountSelector();
    }
  }, [screen, renderAccountSelector, renderAddAccountActions]);

  return <SheetBottom ref={sheetRef}>{renderAccountScreens()}</SheetBottom>;
};

export default AccountSelector;
