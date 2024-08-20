// Third party dependencies.
import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {View } from 'react-native';

// External dependencies.
import AccountSelectorList from '../../UI/AccountSelectorList';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import UntypedEngine from '../../../core/Engine';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { strings } from '../../../../locales/i18n';
import { useAccounts } from '../../hooks/useAccounts';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import AddAccountActions from '../AddAccountActions';
import {
  AccountListViewSelectorsIDs,
} from '../../../../e2e/selectors/AccountListView.selectors';
// Internal dependencies.
import {
  AccountSelectorProps,
  AccountSelectorScreens,
} from './AccountSelector.types';
import styles from './AccountSelector.styles';
import { useDispatch, useSelector } from 'react-redux';
import { setReloadAccounts } from '../../../actions/accounts';
import { RootState } from '../../../reducers';
import { useMetrics } from '../../../components/hooks/useMetrics';

const AccountSelector = ({ route }: AccountSelectorProps) => {
  const dispatch = useDispatch();
  const { trackEvent } = useMetrics();
  const { onSelectAccount, checkBalanceError } = route.params || {};

  const { reloadAccounts } = useSelector((state: RootState) => state.accounts);
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Engine = UntypedEngine as any;
  const sheetRef = useRef<BottomSheetRef>(null);
  const { accounts, ensByAccountAddress } = useAccounts({
    checkBalanceError,
    isLoading: reloadAccounts,
  });
  const [screen, setScreen] = useState<AccountSelectorScreens>(
    AccountSelectorScreens.AccountSelector,
  );

  useEffect(() => {
    if (reloadAccounts) {
      dispatch(setReloadAccounts(false));
    }
  }, [dispatch, reloadAccounts]);

  const _onSelectAccount = useCallback(
    (address: string) => {
      Engine.setSelectedAddress(address);
      sheetRef.current?.onCloseBottomSheet();
      onSelectAccount?.(address);

      // Track Event: "Switched Account"
      trackEvent(MetaMetricsEvents.SWITCHED_ACCOUNT, {
        source: 'Wallet Tab',
        number_of_accounts: accounts?.length,
      });
    },
    [Engine, accounts?.length, onSelectAccount, trackEvent],
  );

  const onRemoveImportedAccount = useCallback(
    ({ nextActiveAddress }: { nextActiveAddress: string }) => {
      nextActiveAddress && Engine.setSelectedAddress(nextActiveAddress);
    },
    [Engine],
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
          testID={AccountListViewSelectorsIDs.ACCOUNT_LIST_ID}
        />
        <View style={styles.sheet}>
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('account_actions.add_account_or_hardware_wallet')}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            onPress={() => setScreen(AccountSelectorScreens.AddAccountActions)}
            testID={AccountListViewSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID}
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

  return <BottomSheet ref={sheetRef}>{renderAccountScreens()}</BottomSheet>;
};

export default AccountSelector;
