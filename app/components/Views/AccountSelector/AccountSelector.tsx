// Third party dependencies.
import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

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
import { setReloadAccounts } from '../../../actions/accounts';
import { RootState } from '../../../reducers';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { TraceName, endTrace } from '../../../util/trace';

const AccountSelector = ({ route }: AccountSelectorProps) => {
  const renderCount = useRef(0);
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();

  // Memoize route params to prevent unnecessary re-renders
  const routeParams = useMemo(() => route?.params, [route?.params]);

  // Extract params from route once to avoid recalculations
  const {
    onSelectAccount,
    checkBalanceError,
    disablePrivacyMode,
    navigateToAddAccountActions,
  } = routeParams || {};

  // Only select the specific state needed
  const reloadAccounts = useSelector(
    (state: RootState) => state.accounts.reloadAccounts,
  );
  const privacyMode = useSelector(selectPrivacyMode);

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Engine = UntypedEngine as any;
  const sheetRef = useRef<BottomSheetRef>(null);

  // Memoize useAccounts parameters to prevent unnecessary recalculations
  const accountsParams = useMemo(
    () => ({
      checkBalanceError,
      isLoading: reloadAccounts,
    }),
    [checkBalanceError, reloadAccounts],
  );

  const { accounts, ensByAccountAddress } = useAccounts(accountsParams);

  // Initialize screen state only once with initial value
  const [screen, setScreen] = useState<AccountSelectorScreens>(
    () => navigateToAddAccountActions ?? AccountSelectorScreens.AccountSelector,
  );

  useEffect(() => {
    renderCount.current += 1;
    // eslint-disable-next-line no-console
    console.log('AccountSelector rendered', renderCount.current);
  });

  useEffect(() => {
    endTrace({ name: TraceName.AccountList });
  }, []);

  // Handle reload accounts in a separate effect
  useEffect(() => {
    if (reloadAccounts) {
      dispatch(setReloadAccounts(false));
    }
  }, [dispatch, reloadAccounts]);

  // Memoize handlers to prevent unnecessary re-renders
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

  // Handler for adding accounts
  const handleAddAccount = useCallback(() => {
    setScreen(AccountSelectorScreens.AddAccountActions);
  }, []);

  // Handler for returning from add accounts screen
  const handleBackToSelector = useCallback(() => {
    setScreen(AccountSelectorScreens.AccountSelector);
  }, []);

  // Memoize the account selector rendering to prevent unnecessary re-renders
  const renderAccountSelector = useMemo(
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
            onPress={handleAddAccount}
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
      handleAddAccount,
    ],
  );

  const renderAddAccountActions = useMemo(
    () => <AddAccountActions onBack={handleBackToSelector} />,
    [handleBackToSelector],
  );

  // Render the current screen based on state
  const currentScreen = useMemo(() => {
    switch (screen) {
      case AccountSelectorScreens.AccountSelector:
        return renderAccountSelector;
      case AccountSelectorScreens.AddAccountActions:
        return renderAddAccountActions;
      default:
        return renderAccountSelector;
    }
  }, [screen, renderAccountSelector, renderAddAccountActions]);

  return <BottomSheet ref={sheetRef}>{currentScreen}</BottomSheet>;
};

// Use React.memo to prevent unnecessary re-renders
export default React.memo(AccountSelector);
