// Third party dependencies.
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InteractionManager, View } from 'react-native';

// External dependencies.
import EvmAccountSelectorList from '../../UI/EvmAccountSelectorList';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Engine from '../../../core/Engine';
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
import { useStyles } from '../../../component-library/hooks';
import {
  AccountSelectorProps,
  AccountSelectorScreens,
} from './AccountSelector.types';
import styleSheet from './AccountSelector.styles';
import { useDispatch, useSelector } from 'react-redux';
import { setReloadAccounts } from '../../../actions/accounts';
import { RootState } from '../../../reducers';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { TraceName, endTrace } from '../../../util/trace';

const AccountSelector = ({ route }: AccountSelectorProps) => {
  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();
  const routeParams = useMemo(() => route?.params, [route?.params]);
  const {
    onSelectAccount,
    checkBalanceError,
    disablePrivacyMode,
    navigateToAddAccountActions,
  } = routeParams || {};

  const reloadAccounts = useSelector(
    (state: RootState) => state.accounts.reloadAccounts,
  );
  const privacyMode = useSelector(selectPrivacyMode);
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
  const [screen, setScreen] = useState<AccountSelectorScreens>(
    () => navigateToAddAccountActions ?? AccountSelectorScreens.AccountSelector,
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
      InteractionManager.runAfterInteractions(() => {
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
      });
    },
    [accounts?.length, onSelectAccount, trackEvent, createEventBuilder],
  );

  // Handler for adding accounts
  const handleAddAccount = useCallback(() => {
    setScreen(AccountSelectorScreens.AddAccountActions);
  }, []);

  // Handler for returning from add accounts screen
  const handleBackToSelector = useCallback(() => {
    setScreen(AccountSelectorScreens.AccountSelector);
  }, []);

  const onRemoveImportedAccount = useCallback(
    ({ nextActiveAddress }: { nextActiveAddress: string }) => {
      nextActiveAddress && Engine.setSelectedAddress(nextActiveAddress);
    },
    [],
  );

  const renderAccountSelector = useCallback(
    () => (
      <Fragment>
        <SheetHeader title={strings('accounts.accounts_title')} />
        <EvmAccountSelectorList
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
      styles.sheet,
    ],
  );

  const renderAddAccountActions = useCallback(
    () => <AddAccountActions onBack={handleBackToSelector} />,
    [handleBackToSelector],
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

  return (
    <BottomSheet style={styles.bottomSheetContent} ref={sheetRef}>
      {renderAccountScreens()}
    </BottomSheet>
  );
};

export default React.memo(AccountSelector);
