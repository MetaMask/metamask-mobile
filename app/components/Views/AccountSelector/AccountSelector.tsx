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
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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

/**
 * Motion aligned with @react-navigation/stack horizontal presets so the account list
 * matches Settings / token-details stack transitions (iOS: TransitionIOSSpec;
 * Android: ScaleFromCenterAndroidSpec timing + easing).
 */
const ACCOUNT_SELECTOR_IOS_SPRING = {
  damping: 500,
  mass: 3,
  overshootClamping: true,
  stiffness: 1000,
} as const;

const ACCOUNT_SELECTOR_ANDROID_TRANSITION_MS = 400;
const ACCOUNT_SELECTOR_ANDROID_EASING = Easing.bezier(0.35, 0.45, 0, 1);

const AccountSelector = ({ route }: AccountSelectorProps) => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { y: frameY } = useSafeAreaFrame();
  const { width: screenWidth } = useWindowDimensions();
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
  const translateX = useSharedValue(screenWidth);

  useLayoutEffect(() => {
    if (shouldRedirectToAddWallet) {
      navigation.dispatch(StackActions.replace(Routes.SHEET.ADD_WALLET));
    }
  }, [navigation, shouldRedirectToAddWallet]);

  const isAccountSelector = useMemo(
    () => screen === AccountSelectorScreens.AccountSelector,
    [screen],
  );

  useEffect(() => {
    if (reloadAccounts) {
      dispatch(setReloadAccounts(false));
    }
  }, [dispatch, reloadAccounts]);

  // Tracing for the account list: start at layout flush, end after the open transition.
  useLayoutEffect(() => {
    if (!isAccountSelector) {
      return;
    }

    trace({
      name: TraceName.ShowAccountList,
      op: TraceOperation.AccountUi,
      tags: getTraceTags(store.getState()),
    });
  }, [isAccountSelector]);

  useEffect(() => {
    if (!isAccountSelector) {
      return;
    }

    const onAnimationComplete = () => {
      endTrace({
        name: TraceName.ShowAccountList,
      });
    };

    if (Platform.OS === 'ios') {
      translateX.value = withSpring(0, ACCOUNT_SELECTOR_IOS_SPRING, () =>
        runOnJS(onAnimationComplete)(),
      );
    } else {
      translateX.value = withTiming(
        0,
        {
          duration: ACCOUNT_SELECTOR_ANDROID_TRANSITION_MS,
          easing: ACCOUNT_SELECTOR_ANDROID_EASING,
        },
        () => runOnJS(onAnimationComplete)(),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAccountSelector]);

  const handleClose = useCallback(() => {
    const onCloseComplete = () => {
      navigation.goBack();
    };

    if (Platform.OS === 'ios') {
      translateX.value = withSpring(
        screenWidth,
        ACCOUNT_SELECTOR_IOS_SPRING,
        () => runOnJS(onCloseComplete)(),
      );
    } else {
      translateX.value = withTiming(
        screenWidth,
        {
          duration: ACCOUNT_SELECTOR_ANDROID_TRANSITION_MS,
          easing: ACCOUNT_SELECTOR_ANDROID_EASING,
        },
        () => runOnJS(onCloseComplete)(),
      );
    }
  }, [translateX, navigation, screenWidth]);

  const _onSelectMultichainAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      Engine.context.AccountTreeController.setSelectedAccountGroup(
        accountGroup.id,
      );
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
    [accounts?.length, trackEvent, createEventBuilder, handleClose],
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

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
        <Animated.View style={[tw.style('flex-1'), animatedStyle]}>
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
        </Animated.View>
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
