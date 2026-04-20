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
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
  View,
} from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  useDerivedValue,
  interpolate,
} from 'react-native-reanimated';

// External dependencies.
import MultichainAccountSelectorList from '../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { MultichainAddWalletActions } from '../../../component-library/components-temp/MultichainAccounts';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import Engine from '../../../core/Engine';
import { store } from '../../../store';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { strings } from '../../../../locales/i18n';
import { useAccounts } from '../../hooks/useAccounts';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import Text from '../../../component-library/components/Texts/Text/Text';
import AddAccountActions from '../AddAccountActions';
import { AccountListBottomSheetSelectorsIDs } from './AccountListBottomSheet.testIds';
import { CommonSelectorsIDs } from '../../../util/Common.testIds';
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
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import {
  TraceName,
  TraceOperation,
  endTrace,
  trace,
} from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';
import { ButtonProps } from '../../../component-library/components/Buttons/Button/Button.types';
import { useSyncSRPs } from '../../hooks/useSyncSRPs';
import { useAccountsOperationsLoadingStates } from '../../../util/accounts/useAccountsOperationsLoadingStates';
import { Box } from '../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../UI/Box/box.types';
import { AnimationDuration } from '../../../component-library/constants/animation.constants';
import Routes from '../../../constants/navigation/Routes';

const AccountSelector = ({ route }: AccountSelectorProps) => {
  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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

  const translateX = useSharedValue(screenWidth);

  // Backdrop opacity animation - fades in as screen slides in from right
  const backdropOpacity = useDerivedValue(() =>
    interpolate(translateX.value, [screenWidth, 0], [0, 0.5]),
  );

  useEffect(() => {
    if (reloadAccounts) {
      dispatch(setReloadAccounts(false));
    }
  }, [dispatch, reloadAccounts]);

  useLayoutEffect(() => {
    if (!isAccountSelector) return;

    const onAnimationComplete = () => {
      endTrace({
        name: TraceName.ShowAccountList,
      });
    };

    translateX.value = withSpring(
      0,
      {
        damping: 20,
        stiffness: 500,
        mass: 0.3,
      },
      () => runOnJS(onAnimationComplete)(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAccountSelector]);

  const closeModal = useCallback(() => {
    const onCloseComplete = () => {
      navigation.goBack();
    };

    translateX.value = withTiming(
      screenWidth,
      { duration: AnimationDuration.Fast },
      () => runOnJS(onCloseComplete)(),
    );
  }, [translateX, navigation, screenWidth]);

  const _onSelectMultichainAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      Engine.context.AccountTreeController.setSelectedAccountGroup(
        accountGroup.id,
      );
      closeModal();

      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWITCHED_ACCOUNT)
          .addProperties({
            source: 'Wallet Tab',
            number_of_accounts: accounts?.length,
          })
          .build(),
      );
    },
    [accounts?.length, trackEvent, createEventBuilder, closeModal],
  );

  const handleAddAccount = useCallback(() => {
    navigation.navigate(Routes.SHEET.ADD_WALLET);
  }, [navigation]);

  const handleBackToSelector = useCallback(() => {
    setScreen(AccountSelectorScreens.AccountSelector);
  }, []);

  // Tracing for the account list rendering:
  useEffect(() => {
    if (isAccountSelector) {
      trace({
        name: TraceName.ShowAccountList,
        op: TraceOperation.AccountUi,
        tags: getTraceTags(store.getState()),
      });
      // Trace ends in animation callback
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
          <View
            style={[
              styles.accountSelectorFooter,
              styles.accountSelectorFooterContent,
            ]}
          >
            {addAccountButtonProps.map((buttonProp, index) => (
              <Button
                key={index}
                style={
                  index > 0
                    ? styles.footerButtonSubsequent
                    : styles.footerButton
                }
                {...buttonProp}
              />
            ))}
          </View>
        )}
      </Fragment>
    ),
    [
      selectedAccountGroup,
      _onSelectMultichainAccount,
      disableAddAccountButton,
      addAccountButtonProps,
      styles.accountSelectorFooterContent,
      styles.accountSelectorFooter,
      styles.footerButton,
      styles.footerButtonSubsequent,
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const showAddWalletModal =
    screen === AccountSelectorScreens.AddAccountActions ||
    screen === AccountSelectorScreens.MultichainAddWalletActions;

  if (shouldRedirectToAddWallet) {
    return null;
  }

  return (
    <>
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={keyboardAvoidingViewEnabled}
      >
        <Animated.View
          style={[
            styles.container,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
            animatedStyle,
          ]}
        >
          <HeaderCompactStandard
            title={strings('accounts.accounts_title')}
            onBack={closeModal}
            backButtonProps={{
              testID: CommonSelectorsIDs.BACK_ARROW_BUTTON,
            }}
          />
          {renderAccountSelector()}
        </Animated.View>
      </KeyboardAvoidingView>

      <Modal
        visible={showAddWalletModal}
        animationType="slide"
        onRequestClose={handleBackToSelector}
      >
        {showAddWalletModal ? (
          <View
            style={[
              styles.addWalletModalContainer,
              {
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              },
            ]}
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
          </View>
        ) : null}
      </Modal>
    </>
  );
};

export default React.memo(AccountSelector);
