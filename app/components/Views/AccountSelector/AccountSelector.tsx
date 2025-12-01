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
import EvmAccountSelectorList from '../../UI/EvmAccountSelectorList';
import MultichainAccountSelectorList from '../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { MultichainAddWalletActions } from '../../../component-library/components-temp/MultichainAccounts';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Engine from '../../../core/Engine';
import { useFeatureFlag, FeatureFlagNames } from '../../hooks/useFeatureFlag';
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
  const isFullPageAccountList = useFeatureFlag(
    FeatureFlagNames.fullPageAccountList,
  );
  const sheetRef = useRef<BottomSheetRef>(null);

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
    if (screen !== AccountSelectorScreens.AccountSelector) return;

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
  }, [isFullPageAccountList, screen]);

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

  const _onSelectAccount = useCallback(
    (address: string) => {
      Engine.setSelectedAddress(address);
      closeModal();
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
    [
      accounts?.length,
      onSelectAccount,
      trackEvent,
      createEventBuilder,
      closeModal,
    ],
  );

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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (
    isFullPageAccountList &&
    screen === AccountSelectorScreens.AccountSelector
  ) {
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
            <SheetHeader
              title={strings('accounts.accounts_title')}
              onBack={closeModal}
            />
            {renderAccountScreens()}
          </Animated.View>
        </KeyboardAvoidingView>
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
      {screen === AccountSelectorScreens.AccountSelector && (
        <SheetHeader title={strings('accounts.accounts_title')} />
      )}
      {screen === AccountSelectorScreens.AddAccountActions && (
        <BottomSheetHeader>
          {strings('account_actions.add_account')}
        </BottomSheetHeader>
      )}
      {screen === AccountSelectorScreens.MultichainAddWalletActions && (
        <BottomSheetHeader>
          {strings('multichain_accounts.add_wallet')}
        </BottomSheetHeader>
      )}
      {renderAccountScreens()}
    </BottomSheet>
  );
};

export default React.memo(AccountSelector);
