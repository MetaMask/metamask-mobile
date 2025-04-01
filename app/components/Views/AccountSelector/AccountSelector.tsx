// Third party dependencies.
import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';

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
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { selectPrivacyMode } from '../../../selectors/preferencesController';

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
import { TraceName, endTrace } from '../../../util/trace';
import AddNewHdAccount from '../AddNewHdAccount';

const AccountSelector = ({ route }: AccountSelectorProps) => {
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();
  const {
    onSelectAccount,
    checkBalanceError,
    disablePrivacyMode,
    navigateToAddAccountActions,
  } = route.params || {};

  const { reloadAccounts } = useSelector((state: RootState) => state.accounts);
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Engine = UntypedEngine as any;
  const privacyMode = useSelector(selectPrivacyMode);
  const sheetRef = useRef<BottomSheetRef>(null);
  const { accounts, ensByAccountAddress } = useAccounts({
    checkBalanceError,
    isLoading: reloadAccounts,
    shouldAggregateAcrossChains: true,
  });
  const [screen, setScreen] = useState<AccountSelectorScreens>(
    navigateToAddAccountActions ?? AccountSelectorScreens.AccountSelector,
  );
  useEffect(() => {
    endTrace({ name: TraceName.AccountList });
  }, []);
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
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWITCHED_ACCOUNT)
          .addProperties({
            source: 'Wallet Tab',
            number_of_accounts: accounts?.length,
          })
          .build(),
      );
    },
    [Engine, accounts?.length, onSelectAccount, trackEvent, createEventBuilder],
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
          privacyMode={privacyMode && !disablePrivacyMode}
          testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID}
        />
        <View style={styles.sheet}>
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('account_actions.add_account_or_hardware_wallet')}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            onPress={() => setScreen(AccountSelectorScreens.AddAccountActions)}
            testID={
              AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID
            }
          />
        </View>
      </Fragment>
    ),
    [
      accounts,
      _onSelectAccount,
      ensByAccountAddress,
      onRemoveImportedAccount,
      privacyMode,
      disablePrivacyMode,
    ],
  );

  const renderAddAccountActions = useCallback(
    () => (
      <AddAccountActions
        onBack={() => setScreen(AccountSelectorScreens.AccountSelector)}
        onAddHdAccount={() =>
          setScreen(AccountSelectorScreens.AddHdAccountSelector)
        }
      />
    ),
    [],
  );

  const renderAddHdAccountSelector = useCallback(
    () => (
      <AddNewHdAccount
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
      case AccountSelectorScreens.AddHdAccountSelector:
        return renderAddHdAccountSelector();
      default:
        return renderAccountSelector();
    }
  }, [
    screen,
    renderAccountSelector,
    renderAddAccountActions,
    renderAddHdAccountSelector,
  ]);

  return <BottomSheet ref={sheetRef}>{renderAccountScreens()}</BottomSheet>;
};

export default AccountSelector;
