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
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import Text from '../../../component-library/components/Texts/Text/Text';
import AddAccountActions from '../AddAccountActions';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';
import { AccountGroupObject } from '@metamask/account-tree-controller';

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
  const { navigateToAddAccountActions } = routeParams || {};

  const reloadAccounts = useSelector(
    (state: RootState) => state.accounts.reloadAccounts,
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
    return strings('multichain_accounts.add_wallet');
  }, [isAccountSyncingInProgress, accountOperationLoadingMessage]);

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
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder],
  );

  const handleAddAccount = useCallback(() => {
    setScreen(AccountSelectorScreens.MultichainAddWalletActions);
  }, []);

  const handleBackToSelector = useCallback(() => {
    setScreen(AccountSelectorScreens.AccountSelector);
  }, []);

  // Tracing for the account list rendering:
  const isAccountSelector = useMemo(
    () => screen === AccountSelectorScreens.AccountSelector,
    [screen],
  );

  useEffect(() => {
    if (isAccountSelector) {
      trace({
        name: TraceName.ShowAccountList,
        op: TraceOperation.AccountUi,
        tags: getTraceTags(store.getState()),
      });
    }
  }, [isAccountSelector]);
  // We want to track the full render of the account list, meaning when the full animation is done, so
  // we hook the open animation and end the trace there.
  const onOpen = useCallback(() => {
    if (isAccountSelector) {
      endTrace({
        name: TraceName.ShowAccountList,
      });
    }
  }, [isAccountSelector]);

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
            <Text variant={TextVariant.BodyMDBold}>{buttonLabel}</Text>
          </Box>
        ),
        size: ButtonSize.Lg,
        width: ButtonWidthTypes.Full,
        onPress: handleAddAccount,
        testID: AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
      },
    ],
    [handleAddAccount, buttonLabel, isAccountSyncingInProgress],
  );

  const renderAccountSelector = useCallback(
    () => (
      <Fragment>
        <SheetHeader title={strings('accounts.accounts_title')} />
        <MultichainAccountSelectorList
          onSelectAccount={_onSelectMultichainAccount}
          selectedAccountGroups={
            selectedAccountGroup ? [selectedAccountGroup] : []
          }
          testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID}
          setKeyboardAvoidingViewEnabled={setKeyboardAvoidingViewEnabled}
        />
        <BottomSheetFooter
          buttonPropsArray={addAccountButtonProps}
          style={styles.sheet}
        />
      </Fragment>
    ),
    [
      selectedAccountGroup,
      _onSelectMultichainAccount,
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
