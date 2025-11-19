// Third party dependencies.
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// External dependencies.
import EvmAccountSelectorList from '../../UI/EvmAccountSelectorList';
import MultichainAccountSelectorList from '../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { MultichainAddWalletActions } from '../../../component-library/components-temp/MultichainAccounts';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Engine from '../../../core/Engine';
import { store } from '../../../store';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { strings } from '../../../../locales/i18n';
import { useAccounts } from '../../hooks/useAccounts';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import Text from '../../../component-library/components/Texts/Text/Text';
import AddAccountActions from '../AddAccountActions';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { selectPrivacyMode } from '../../../selectors/preferencesController';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AccountSyncTracker } from '../../../util/performance/AccountSyncTracker';

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
import {
  TraceName,
  TraceOperation,
  endTrace,
  trace,
} from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';
import BottomSheetFooter from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonProps } from '../../../component-library/components/Buttons/Button/Button.types';
import { useSyncSRPs } from '../../hooks/useSyncSRPs';
import { useAccountsOperationsLoadingStates } from '../../../util/accounts/useAccountsOperationsLoadingStates';
import { ActivityIndicator } from 'react-native';
import { Box } from '../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../UI/Box/box.types';

const AccountSelector = ({ route }: AccountSelectorProps) => {
  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();
  const routeParams = useMemo(() => route?.params, [route?.params]);
  const {
    onSelectAccount,
    disablePrivacyMode,
    navigateToAddAccountActions,
    isEvmOnly,
  } = routeParams || {};

  const reloadAccounts = useSelector(
    (state: RootState) => state.accounts.reloadAccounts,
  );
  const privacyMode = useSelector(selectPrivacyMode);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const sheetRef = useRef<BottomSheetRef>(null);

  const {
    isAccountSyncingInProgress,
    loadingMessage: accountOperationLoadingMessage,
  } = useAccountsOperationsLoadingStates();

  useSyncSRPs();

  const buttonLabel = useMemo(() => {
    if (isAccountSyncingInProgress) {
      return accountOperationLoadingMessage;
    }

    if (isMultichainAccountsState2Enabled) {
      return strings('multichain_accounts.add_wallet');
    }

    return strings('account_actions.add_account_or_hardware_wallet');
  }, [
    isAccountSyncingInProgress,
    accountOperationLoadingMessage,
    isMultichainAccountsState2Enabled,
  ]);

  // Memoize useAccounts parameters to prevent unnecessary recalculations
  const accountsParams = useMemo(
    () => ({
      isLoading: reloadAccounts,
    }),
    [reloadAccounts],
  );

  const {
    accounts: allAccounts,
    ensByAccountAddress,
    evmAccounts,
  } = useAccounts(accountsParams);

  const accounts = isEvmOnly ? evmAccounts : allAccounts;

  const [screen, setScreen] = useState<AccountSelectorScreens>(
    () => navigateToAddAccountActions ?? AccountSelectorScreens.AccountSelector,
  );
  const [keyboardAvoidingViewEnabled, setKeyboardAvoidingViewEnabled] =
    useState(false);

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
    [accounts?.length, onSelectAccount, trackEvent, createEventBuilder],
  );

  const _onSelectMultichainAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      Engine.context.AccountTreeController.setSelectedAccountGroup(
        accountGroup.id,
      );
      sheetRef.current?.onCloseBottomSheet();

      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWITCHED_ACCOUNT)
          .addProperties({
            source: 'Wallet Tab',
            number_of_accounts: accounts?.length,
          })
          .build(),
      );
    },
    [accounts?.length, trackEvent, createEventBuilder],
  );

  const handleAddAccount = useCallback(() => {
    if (isMultichainAccountsState2Enabled) {
      setScreen(AccountSelectorScreens.MultichainAddWalletActions);
    } else {
      setScreen(AccountSelectorScreens.AddAccountActions);
    }
  }, [isMultichainAccountsState2Enabled]);

  const handleBackToSelector = useCallback(() => {
    setScreen(AccountSelectorScreens.AccountSelector);
  }, []);

  const onRemoveImportedAccount = useCallback(
    ({ nextActiveAddress }: { nextActiveAddress: string }) => {
      nextActiveAddress && Engine.setSelectedAddress(nextActiveAddress);
    },
    [],
  );

  // Performance measurement for account sync investigation
  const accountSyncStartTimeRef = useRef<number | null>(null);

  // Tracing for the account list rendering:
  const isAccountSelector = useMemo(
    () => screen === AccountSelectorScreens.AccountSelector,
    [screen],
  );
  useEffect(() => {
    if (isAccountSelector) {
      accountSyncStartTimeRef.current = performance.now();
      // Start tracking session when account selector opens
      AccountSyncTracker.startSession(`account_selector_${Date.now()}`);
      AccountSyncTracker.startPhase('accountSelectorOpen', {
        accountCount: accounts?.length || 0,
      });
      
      trace({
        name: TraceName.ShowAccountList,
        op: TraceOperation.AccountUi,
        tags: getTraceTags(store.getState()),
      });
    }
  }, [isAccountSelector, accounts?.length]);
  
  // We want to track the full render of the account list, meaning when the full animation is done, so
  // we hook the open animation and end the trace there.
  const onOpen = useCallback(() => {
    if (isAccountSelector) {
      if (accountSyncStartTimeRef.current !== null) {
        const totalTime = performance.now() - accountSyncStartTimeRef.current;
        // End the accountSelectorOpen phase but DON'T end the session yet
        // This allows other operations (ENS, token refresh) to continue being tracked
        AccountSyncTracker.endPhase('accountSelectorOpen', {
          totalTime: `${totalTime.toFixed(2)}ms`,
          accountCount: accounts?.length || 0,
        });
        
        // DON'T end the session here - let ENS lookups complete first
        // The session will be ended when ENS lookups finish (see useAccounts.ts)
        console.log('🔍 [DEBUG] Account selector animation complete, waiting for ENS lookups...');
        
        accountSyncStartTimeRef.current = null;
      }
      
      endTrace({
        name: TraceName.ShowAccountList,
      });
    }
  }, [isAccountSelector, accounts?.length]);

  const addAccountButtonProps: ButtonProps[] = useMemo(
    () => [
      {
        variant: ButtonVariants.Secondary,
        isDisabled: isAccountSyncingInProgress,
        label: (
          <Box
            alignItems={AlignItems.center}
            justifyContent={JustifyContent.center}
            flexDirection={FlexDirection.Row}
            gap={8}
          >
            {isAccountSyncingInProgress && <ActivityIndicator size="small" />}
            <Text
              variant={
                isMultichainAccountsState2Enabled
                  ? TextVariant.BodyMDBold
                  : TextVariant.BodyMD
              }
            >
              {buttonLabel}
            </Text>
          </Box>
        ),
        size: ButtonSize.Lg,
        width: ButtonWidthTypes.Full,
        onPress: handleAddAccount,
        testID: AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      },
    ],
    [
      handleAddAccount,
      isMultichainAccountsState2Enabled,
      buttonLabel,
      isAccountSyncingInProgress,
    ],
  );

  const renderAccountSelector = useCallback(
    () => (
      <Fragment>
        <SheetHeader title={strings('accounts.accounts_title')} />
        {isMultichainAccountsState2Enabled && selectedAccountGroup ? (
          <MultichainAccountSelectorList
            onSelectAccount={_onSelectMultichainAccount}
            selectedAccountGroups={[selectedAccountGroup]}
            testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID}
            setKeyboardAvoidingViewEnabled={setKeyboardAvoidingViewEnabled}
          />
        ) : (
          <EvmAccountSelectorList
            onSelectAccount={_onSelectAccount}
            onRemoveImportedAccount={onRemoveImportedAccount}
            accounts={accounts}
            ensByAccountAddress={ensByAccountAddress}
            isRemoveAccountEnabled
            privacyMode={privacyMode && !disablePrivacyMode}
            testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID}
          />
        )}
        <BottomSheetFooter
          buttonPropsArray={addAccountButtonProps}
          style={styles.sheet}
        />
      </Fragment>
    ),
    [
      isMultichainAccountsState2Enabled,
      selectedAccountGroup,
      _onSelectMultichainAccount,
      accounts,
      _onSelectAccount,
      ensByAccountAddress,
      onRemoveImportedAccount,
      privacyMode,
      disablePrivacyMode,
      styles.sheet,
      addAccountButtonProps,
    ],
  );

  const renderAddAccountActions = useCallback(
    () => <AddAccountActions onBack={handleBackToSelector} />,
    [handleBackToSelector],
  );

  const renderMultichainAddWalletActions = useCallback(
    () => <MultichainAddWalletActions onBack={handleBackToSelector} />,
    [handleBackToSelector],
  );

  const renderAccountScreens = useCallback(() => {
    switch (screen) {
      case AccountSelectorScreens.AccountSelector:
        return renderAccountSelector();
      case AccountSelectorScreens.AddAccountActions:
        return renderAddAccountActions();
      case AccountSelectorScreens.MultichainAddWalletActions:
        return renderMultichainAddWalletActions();
      default:
        return renderAccountSelector();
    }
  }, [
    screen,
    renderAccountSelector,
    renderAddAccountActions,
    renderMultichainAddWalletActions,
  ]);

  return (
    <BottomSheet
      style={styles.bottomSheetContent}
      ref={sheetRef}
      onOpen={onOpen}
      keyboardAvoidingViewEnabled={keyboardAvoidingViewEnabled}
    >
      {renderAccountScreens()}
    </BottomSheet>
  );
};

export default React.memo(AccountSelector);
