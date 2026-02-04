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
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import HeaderCenter from '../../../component-library/components-temp/HeaderCenter';
import Engine from '../../../core/Engine';
import { selectFullPageAccountListEnabledFlag } from '../../../selectors/featureFlagController/fullPageAccountList';
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
import { AccountListBottomSheetSelectorsIDs } from './AccountListBottomSheet.testIds';
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
import { Box } from '../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../UI/Box/box.types';
import { AnimationDuration } from '../../../component-library/constants/animation.constants';

const AccountSelector = ({ route }: AccountSelectorProps) => {
  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { trackEvent, createEventBuilder } = useMetrics();
  const routeParams = useMemo(() => route?.params, [route?.params]);

  // Feature flag for full-page account list
  const isFullPageAccountList = useSelector(
    selectFullPageAccountListEnabledFlag,
  );
  const sheetRef = useRef<BottomSheetRef>(null);

  const { navigateToAddAccountActions, isEvmOnly, disableAddAccountButton } =
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

  const { accounts: allAccounts, evmAccounts } = useAccounts(accountsParams);

  const accounts = isEvmOnly ? evmAccounts : allAccounts;

  const [screen, setScreen] = useState<AccountSelectorScreens>(
    () => navigateToAddAccountActions ?? AccountSelectorScreens.AccountSelector,
  );
  const [keyboardAvoidingViewEnabled, setKeyboardAvoidingViewEnabled] =
    useState(false);

  // Tracing for the account list rendering:
  const isAccountSelector = useMemo(
    () => screen === AccountSelectorScreens.AccountSelector,
    [screen],
  );

  // Animation using react-native-reanimated - only for full-page version
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
    if (!isFullPageAccountList) return;
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
  }, [isFullPageAccountList, isAccountSelector]);

  const closeModal = useCallback(() => {
    if (isFullPageAccountList) {
      // Full-page version: animate out then navigate back
      const onCloseComplete = () => {
        navigation.goBack();
      };

      translateX.value = withTiming(
        screenWidth,
        { duration: AnimationDuration.Fast },
        () => runOnJS(onCloseComplete)(),
      );
    } else {
      // BottomSheet version: close the sheet
      sheetRef.current?.onCloseBottomSheet();
    }
  }, [isFullPageAccountList, translateX, navigation, screenWidth]);

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
    setScreen(AccountSelectorScreens.MultichainAddWalletActions);
  }, []);

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

  // End trace when bottom sheet opens (only for non-full-page version)
  const onBottomSheetOpen = useCallback(() => {
    if (!isFullPageAccountList && isAccountSelector) {
      endTrace({
        name: TraceName.ShowAccountList,
      });
    }
  }, [isFullPageAccountList, isAccountSelector]);

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

  // Memoize selectedAccountGroups to avoid unnecessary re-renders
  const selectedAccountGroups = useMemo(
    () => (selectedAccountGroup ? [selectedAccountGroup] : []),
    [selectedAccountGroup],
  );

  const renderAccountSelector = useCallback(
    () => (
      <Fragment>
        <MultichainAccountSelectorList
          onSelectAccount={_onSelectMultichainAccount}
          selectedAccountGroups={selectedAccountGroups}
          testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID}
          setKeyboardAvoidingViewEnabled={setKeyboardAvoidingViewEnabled}
          showFooter={!disableAddAccountButton}
        />
        {!disableAddAccountButton && (
          <BottomSheetFooter
            buttonPropsArray={addAccountButtonProps}
            style={styles.sheet}
          />
        )}
      </Fragment>
    ),
    [
      selectedAccountGroups,
      _onSelectMultichainAccount,
      disableAddAccountButton,
      addAccountButtonProps,
      styles.sheet,
      setKeyboardAvoidingViewEnabled,
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (isFullPageAccountList) {
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
            <HeaderCenter
              title={strings('accounts.accounts_title')}
              onBack={closeModal}
            />
            {renderAccountSelector()}
          </Animated.View>
        </KeyboardAvoidingView>

        {/* Add Wallet bottom sheet overlay */}
        {(screen === AccountSelectorScreens.AddAccountActions ||
          screen === AccountSelectorScreens.MultichainAddWalletActions) && (
          <BottomSheet
            onClose={handleBackToSelector}
            shouldNavigateBack={false}
          >
            <BottomSheetHeader onBack={handleBackToSelector}>
              {screen === AccountSelectorScreens.AddAccountActions
                ? strings('account_actions.add_account')
                : strings('multichain_accounts.add_wallet')}
            </BottomSheetHeader>
            {screen === AccountSelectorScreens.AddAccountActions
              ? renderAddAccountActions()
              : renderMultichainAddWalletActions()}
          </BottomSheet>
        )}
      </>
    );
  }

  // Render BottomSheet version
  return (
    <BottomSheet
      ref={sheetRef}
      onOpen={onBottomSheetOpen}
      keyboardAvoidingViewEnabled={keyboardAvoidingViewEnabled}
    >
      <HeaderCenter
        title={
          screen === AccountSelectorScreens.AddAccountActions
            ? strings('account_actions.add_account')
            : screen === AccountSelectorScreens.MultichainAddWalletActions
              ? strings('multichain_accounts.add_wallet')
              : strings('accounts.accounts_title')
        }
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
      />
      {renderAccountScreens()}
    </BottomSheet>
  );
};

export default React.memo(AccountSelector);
