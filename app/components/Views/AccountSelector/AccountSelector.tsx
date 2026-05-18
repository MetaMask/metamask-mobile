// Third party dependencies.
import React, {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
} from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
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
  const tw = useTailwind();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { y: frameY } = useSafeAreaFrame();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const routeParams = useMemo(() => route?.params, [route?.params]);

  const {
    navigateToAddAccountActions,
    disableAddAccountButton,
    onSelectAccount: onSelectAccountFromRoute,
  } = routeParams || {};

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

  const [screen, setScreen] = useState<AccountSelectorScreens>(
    shouldRedirectToAddWallet
      ? AccountSelectorScreens.MultichainAddWalletActions
      : AccountSelectorScreens.AccountSelector,
  );
  const [keyboardAvoidingViewEnabled, setKeyboardAvoidingViewEnabled] =
    useState(false);

  useLayoutEffect(() => {
    if (shouldRedirectToAddWallet) {
      navigation.dispatch(StackActions.replace(Routes.SHEET.ADD_WALLET));
    }
  }, [navigation, shouldRedirectToAddWallet]);

  const isAccountSelector = useMemo(
    () => screen === AccountSelectorScreens.AccountSelector,
    [screen],
  );

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    if (reloadAccounts) {
      dispatch(setReloadAccounts(false));
    }
  }, [dispatch, reloadAccounts]);

  // Tracing for the account list: start at layout flush, end after paint (useEffect).
  useLayoutEffect(() => {
    if (!isAccountSelector) {
      return undefined;
    }
    trace({
      name: TraceName.ShowAccountList,
      op: TraceOperation.AccountUi,
      tags: getTraceTags(store.getState()),
    });
    return () => {
      endTrace({
        name: TraceName.ShowAccountList,
      });
    };
  }, [isAccountSelector]);

  useEffect(() => {
    if (!isAccountSelector) {
      return;
    }
    endTrace({
      name: TraceName.ShowAccountList,
    });
  }, [isAccountSelector]);

  const _onSelectMultichainAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      Engine.context.AccountTreeController.setSelectedAccountGroup(
        accountGroup.id,
      );
      onSelectAccountFromRoute?.(accountGroup);

      handleClose();

      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWITCHED_ACCOUNT)
          .addProperties({
            source: 'Wallet Tab',
            number_of_accounts: accounts?.length,
          })
          .build(),
      );
    },
    [
      accounts?.length,
      trackEvent,
      createEventBuilder,
      handleClose,
      onSelectAccountFromRoute,
    ],
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

  const renderMultichainAddWalletActions = useCallback(
    () => <MultichainAddWalletActions onBack={handleBackToSelector} />,
    [handleBackToSelector],
  );

  const showAddWalletModal =
    screen === AccountSelectorScreens.MultichainAddWalletActions;

  if (shouldRedirectToAddWallet) {
    return null;
  }

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={keyboardAvoidingViewEnabled}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -insets.bottom : frameY}
        style={tw.style('flex-1')}
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
            onBack={handleClose}
            backButtonProps={{
              testID: CommonSelectorsIDs.BACK_ARROW_BUTTON,
            }}
          />
          {renderAccountSelector()}
        </Box>
      </KeyboardAvoidingView>

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
              title={strings('multichain_accounts.add_wallet')}
              onBack={handleBackToSelector}
              backButtonProps={{
                testID: CommonSelectorsIDs.BACK_ARROW_BUTTON,
              }}
            />
            {renderMultichainAddWalletActions()}
          </Box>
        ) : null}
      </Modal>
    </>
  );
};

export default React.memo(AccountSelector);
