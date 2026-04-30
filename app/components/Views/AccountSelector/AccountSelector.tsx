// Third party dependencies.
import React, {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheet,
  BottomSheetRef,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

// External dependencies.
import MultichainAccountSelectorList from '../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { MultichainAddWalletActions } from '../../../component-library/components-temp/MultichainAccounts';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import Engine from '../../../core/Engine';
import { store } from '../../../store';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { strings } from '../../../../locales/i18n';
import { useAccounts } from '../../hooks/useAccounts';
import AddAccountActions from '../AddAccountActions';
import { AccountListBottomSheetSelectorsIDs } from './AccountListBottomSheet.testIds';
import { CommonSelectorsIDs } from '../../../util/Common.testIds';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';
import { AccountGroupObject } from '@metamask/account-tree-controller';

// Internal dependencies.
import {
  AccountSelectorProps,
  AccountSelectorScreens,
} from './AccountSelector.types';
import { useDispatch, useSelector } from 'react-redux';
import { setReloadAccounts } from '../../../actions/accounts';
import { RootState } from '../../../reducers';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import {
  TraceName,
  TraceOperation,
  endTrace,
  trace,
} from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';
import { useSyncSRPs } from '../../hooks/useSyncSRPs';
import { useAccountsOperationsLoadingStates } from '../../../util/accounts/useAccountsOperationsLoadingStates';
import Routes from '../../../constants/navigation/Routes';

const AccountSelector = ({ route }: AccountSelectorProps) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const routeParams = useMemo(() => route?.params, [route?.params]);

  const { navigateToAddAccountActions, disableAddAccountButton } =
    routeParams || {};

  const reloadAccounts = useSelector(
    (state: RootState) => state.accounts.reloadAccounts,
  );
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);

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

  // Memoize useAccounts parameters to prevent unnecessary recalculations
  const accountsParams = useMemo(
    () => ({
      isLoading: reloadAccounts,
      fetchENS: false,
    }),
    [reloadAccounts],
  );

  const { accounts } = useAccounts(accountsParams);
  const shouldRedirectToAddWallet =
    navigateToAddAccountActions ===
    AccountSelectorScreens.MultichainAddWalletActions;

  const getInitialScreen = (): AccountSelectorScreens => {
    if (shouldRedirectToAddWallet) {
      return AccountSelectorScreens.MultichainAddWalletActions;
    }
    if (
      navigateToAddAccountActions === AccountSelectorScreens.AddAccountActions
    ) {
      return AccountSelectorScreens.AddAccountActions;
    }
    return AccountSelectorScreens.AccountSelector;
  };

  const [screen, setScreen] =
    useState<AccountSelectorScreens>(getInitialScreen());
  const [keyboardAvoidingViewEnabled, setKeyboardAvoidingViewEnabled] =
    useState(false);

  useLayoutEffect(() => {
    if (shouldRedirectToAddWallet) {
      navigation.dispatch(StackActions.replace(Routes.SHEET.ADD_WALLET));
    }
  }, [navigation, shouldRedirectToAddWallet]);

  // Tracing for the account list rendering:
  const isAccountSelector = useMemo(
    () => screen === AccountSelectorScreens.AccountSelector,
    [screen],
  );

  const dismissSheet = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  useEffect(() => {
    if (reloadAccounts) {
      dispatch(setReloadAccounts(false));
    }
  }, [dispatch, reloadAccounts]);

  // Tracing for the account list rendering:
  useEffect(() => {
    if (isAccountSelector) {
      trace({
        name: TraceName.ShowAccountList,
        op: TraceOperation.AccountUi,
        tags: getTraceTags(store.getState()),
      });
      // Trace ends when design-system BottomSheet finishes opening
    }
  }, [isAccountSelector]);

  const handleSheetOpened = useCallback(() => {
    if (isAccountSelector) {
      endTrace({
        name: TraceName.ShowAccountList,
      });
    }
  }, [isAccountSelector]);

  const _onSelectMultichainAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      Engine.context.AccountTreeController.setSelectedAccountGroup(
        accountGroup.id,
      );
      dismissSheet();

      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWITCHED_ACCOUNT)
          .addProperties({
            source: 'Wallet Tab',
            number_of_accounts: accounts?.length,
          })
          .build(),
      );
    },
    [accounts?.length, trackEvent, createEventBuilder, dismissSheet],
  );

  const handleAddAccount = useCallback(() => {
    navigation.navigate(Routes.SHEET.ADD_WALLET);
  }, [navigation]);

  const handleBackToSelector = useCallback(() => {
    setScreen(AccountSelectorScreens.AccountSelector);
  }, []);

  const renderAccountSelector = useCallback(
    () => (
      <Fragment>
        {selectedAccountGroup ? (
          <MultichainAccountSelectorList
            onSelectAccount={_onSelectMultichainAccount}
            selectedAccountGroups={[selectedAccountGroup]}
            testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID}
            setKeyboardAvoidingViewEnabled={setKeyboardAvoidingViewEnabled}
            showFooter={!disableAddAccountButton}
          />
        ) : null}
        {!disableAddAccountButton && (
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="px-4 pt-6 pb-5"
          >
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              onPress={handleAddAccount}
              isDisabled={isAccountSyncingInProgress}
              testID={
                AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID
              }
              twClassName="flex-1"
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                gap={2}
              >
                {isAccountSyncingInProgress ? (
                  <ActivityIndicator size="small" />
                ) : null}
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {buttonLabel}
                </Text>
              </Box>
            </Button>
          </Box>
        )}
      </Fragment>
    ),
    [
      selectedAccountGroup,
      _onSelectMultichainAccount,
      disableAddAccountButton,
      handleAddAccount,
      buttonLabel,
      isAccountSyncingInProgress,
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

  const showAddWalletModal =
    screen === AccountSelectorScreens.AddAccountActions ||
    screen === AccountSelectorScreens.MultichainAddWalletActions;

  if (shouldRedirectToAddWallet) {
    return null;
  }

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        goBack={() => navigation.goBack()}
        isFullscreen
        keyboardAvoidingViewEnabled={keyboardAvoidingViewEnabled}
        onOpen={handleSheetOpened}
      >
        <Box
          twClassName="flex-1 bg-default"
          style={{
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }}
        >
          <HeaderCompactStandard
            title={strings('accounts.accounts_title')}
            onBack={dismissSheet}
            backButtonProps={{
              testID: CommonSelectorsIDs.BACK_ARROW_BUTTON,
            }}
          />
          {renderAccountSelector()}
        </Box>
      </BottomSheet>

      <Modal
        visible={showAddWalletModal}
        animationType="slide"
        onRequestClose={handleBackToSelector}
      >
        {showAddWalletModal ? (
          <Box
            twClassName="flex-1 bg-default"
            style={{
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            }}
          >
            <HeaderCompactStandard
              title={
                screen === AccountSelectorScreens.AddAccountActions
                  ? strings('account_actions.add_account')
                  : strings('multichain_accounts.add_wallet')
              }
              onBack={handleBackToSelector}
              backButtonProps={{
                testID: CommonSelectorsIDs.BACK_ARROW_BUTTON,
              }}
            />
            {screen === AccountSelectorScreens.AddAccountActions
              ? renderAddAccountActions()
              : renderMultichainAddWalletActions()}
          </Box>
        ) : null}
      </Modal>
    </>
  );
};

export default React.memo(AccountSelector);
