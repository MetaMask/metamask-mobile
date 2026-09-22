import {
  useNavigation,
  useRoute,
  RouteProp,
  CommonActions,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useCardAuth } from '../../hooks/useCardAuth';
import { useCardSignIn } from '../../hooks/useCardSignIn';
import { CardAuthenticationSelectors } from './CardAuthentication.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import CardMessageBox from '../../components/CardMessageBox/CardMessageBox';
import Logger from '../../../../../util/Logger';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useDispatch, useSelector } from 'react-redux';
import { setOnboardingId } from '../../../../../core/redux/slices/card';
import { selectCardForgotPasswordFeatureEnabled } from '../../../../../selectors/featureFlagController/card';
import { CardMessageBoxType, type Region } from '../../types';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import {
  CardProviderError,
  CardProviderErrorCode,
  type CardSignInOption,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import OnboardingStep from '../../components/Onboarding/OnboardingStep';
import NavigationService from '../../../../../core/NavigationService';
import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { safeToChecksumAddress } from '../../../../../util/address';
import { useAccountGroupName } from '../../../../hooks/multichainAccounts/useAccountGroupName';
import { createAccountSelectorNavDetails } from '../../../../Views/AccountSelector';
import { navigateWithDetails } from '../../../../../util/navigation/navUtils';
import { getCardProviderErrorMessage } from '../../util/getCardProviderErrorMessage';
import useRegions from '../../hooks/useRegions';
import { selectGeolocationLocation } from '../../../../../selectors/geolocationController';
import { mapCountryToLocation } from '../../util/mapCountryToLocation';
import {
  clearOnValueChange,
  createRegionSelectorModalNavigationDetails,
  setOnValueChange,
} from '../../components/Onboarding/RegionSelectorModal';
import { createSignInHelpNavigationDetails } from '../../components/SignInHelpBottomSheet/SignInHelpBottomSheet';
import { useCardUkMigrationState } from '../../hooks/useCardUkMigrationState';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { selectInternalAccountByAddresses } from '../../../../../selectors/accountsController';
import {
  isCountryLocked,
  resolveActiveBanner,
  resolveAuthView,
  type AuthBanner,
  type UkManualMode,
} from './resolveAuthView';
import SignInCountryField from './components/SignInCountryField';
import SignInSkeleton from './components/SignInSkeleton';
import SignInFork from './components/SignInFork';
import SignInWalletFields from './components/SignInWalletFields';
import SignInEmailFields from './components/SignInEmailFields';
import SignInResumeProgress from './components/SignInResumeProgress';
import SignInBanner from './components/SignInBanner';
import SignInOtpFields, { CODE_LENGTH } from './components/SignInOtpFields';
import { useResetOnResolvedKind } from './useResetOnResolvedKind';
import useScreenTransitionComplete from '../../../../hooks/useScreenTransitionComplete';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CardAuthenticationParams = {
  CardAuthentication:
    | {
        showAuthPrompt?: boolean;
        postAuthRedirect?: { screen: string; params?: object };
      }
    | undefined;
};

const CardAuthentication = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const navigation = useNavigation<AppNavigationProp>();
  const isScreenTransitionComplete = useScreenTransitionComplete();
  const route =
    useRoute<RouteProp<CardAuthenticationParams, 'CardAuthentication'>>();
  const showAuthPrompt = route.params?.showAuthPrompt ?? false;
  const postAuthRedirect = route.params?.postAuthRedirect;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Region | null>(null);
  const hasAutoSelectedCountry = useRef(false);
  const walletSignInLock = useRef(false);
  const geoLocation = useSelector(selectGeolocationLocation);
  const isForgotPasswordEnabled = useSelector(
    selectCardForgotPasswordFeatureEnabled,
  );
  const {
    allRegions,
    getRegionByCode,
    isLoading: isLoadingRegions,
  } = useRegions();
  const { state: ukMigrationState } = useCardUkMigrationState();

  const countryKey = selectedCountry?.key ?? null;
  const {
    resolution,
    isResolving,
    retry,
    verifyAccount,
    signInWithWallet,
    selectOption,
  } = useCardSignIn(countryKey);

  const [ukMode, setUkMode] = useState<UkManualMode>(null);
  const [resumeEmail, setResumeEmail] = useState(false);
  const [banner, setBanner] = useState<AuthBanner>(null);
  const [accountMismatch, setAccountMismatch] = useState(false);
  const [walletSubmitting, setWalletSubmitting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [latestValueSubmitted, setLatestValueSubmitted] = useState<
    string | null
  >(null);
  const [resendCooldown, setResendCooldown] = useState(60);
  const dispatch = useDispatch();
  const lastTrackedAuthView = useRef<string | null>(null);

  const accountName = useAccountGroupName();
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const selectedAddress = safeToChecksumAddress(
    selectAccountByScope('eip155:0')?.address,
  );
  const accountsByAddress = useSelector(selectInternalAccountByAddresses);

  const {
    currentStep,
    initiate,
    submit,
    stepAction,
    resetToLogin,
    getErrorMessage,
  } = useCardAuth();
  const { mutate: triggerStepAction } = stepAction;

  const isOtpStep = currentStep.type === 'otp';
  const loading = initiate.isPending || submit.isPending;
  const otpLoading = stepAction.isPending;
  const error =
    initiate.error || submit.error
      ? getErrorMessage(initiate.error ?? submit.error)
      : null;
  const otpError = stepAction.error ? getErrorMessage(stepAction.error) : null;
  const maskedPhoneNumber =
    isOtpStep && currentStep.type === 'otp'
      ? currentStep.destination
      : undefined;

  const view = resolveAuthView({
    isOtpStep,
    isResolving,
    resolution,
    ukMode,
    resumeEmail,
  });

  const countryLocked = isCountryLocked(view, {
    countryKey,
    migrationPhase: ukMigrationState.phase,
  });

  const activeBanner = resolveActiveBanner({ banner, view });

  const walletOption: CardSignInOption | undefined =
    view.mode === 'wallet' || view.mode === 'account_missing'
      ? view.option
      : undefined;

  // Wallet option for the R6 "moved" banner CTA — derived from resolution
  // because the banner appears while the view is still in email/resume mode.
  const movedWalletOption = useMemo((): CardSignInOption | undefined => {
    if (!resolution) return undefined;
    if (resolution.kind === 'resume' || resolution.kind === 'wallet') {
      return resolution.option;
    }
    if (resolution.kind === 'unresolved') {
      return resolution.options.find((o) => o.method === 'siwe');
    }
    return undefined;
  }, [resolution]);

  const emailOption = useMemo((): CardSignInOption | undefined => {
    if (resolution?.kind === 'email') {
      return resolution.option;
    }
    if (resolution?.kind === 'unresolved') {
      return resolution.options.find((o) => o.method === 'email_password');
    }
    if (resolution?.kind === 'resume') {
      return Engine.context.CardController.getSignInOptions(
        countryKey ?? 'GB',
      ).find((o) => o.method === 'email_password');
    }
    return undefined;
  }, [resolution, countryKey]);

  const pinnedAddress =
    view.mode === 'wallet' || view.mode === 'account_missing'
      ? view.address
      : null;
  const pinnedAccount = pinnedAddress
    ? accountsByAddress([pinnedAddress])[0]
    : undefined;
  const displayAccountLabel =
    pinnedAccount?.metadata?.name ?? accountName ?? undefined;
  const displayAccountAddress =
    (view.mode === 'wallet' && view.address ? view.address : selectedAddress) ??
    undefined;

  useEffect(() => {
    if (!allRegions.length || hasAutoSelectedCountry.current) {
      return;
    }
    if (geoLocation === 'UNKNOWN') {
      return;
    }
    const matched = getRegionByCode(geoLocation);
    if (matched) {
      hasAutoSelectedCountry.current = true;
      setSelectedCountry(matched);
      Engine.context.CardController.setUserLocation(
        mapCountryToLocation(matched.key),
      );
    }
  }, [allRegions.length, geoLocation, getRegionByCode]);

  const resetTransientAuthState = useCallback(() => {
    setUkMode(null);
    setResumeEmail(false);
    setBanner(null);
    setAccountMismatch(false);
    setWalletError(null);
  }, []);

  useEffect(() => {
    resetTransientAuthState();
  }, [countryKey, resetTransientAuthState]);

  useResetOnResolvedKind(resolution?.kind, resetTransientAuthState);

  useEffect(() => {
    if (resolution?.kind === 'wallet_account_missing') {
      setBanner('account_missing');
    }
  }, [resolution?.kind]);

  // Transient verify/auth failures should not stick across mode or account changes.
  useEffect(() => {
    setBanner((current) => (current === 'no_card' ? null : current));
    setWalletError(null);
  }, [ukMode, selectedAddress]);

  useEffect(() => () => clearOnValueChange(), []);

  const handleEmailChange = useCallback(
    (newEmail: string) => {
      setEmail(newEmail);
      if (initiate.error || submit.error) {
        initiate.reset();
        submit.reset();
      }
      if (banner === 'bad_creds') setBanner(null);
    },
    [initiate, submit, banner],
  );

  const handlePasswordChange = useCallback(
    (newPassword: string) => {
      setPassword(newPassword);
      if (initiate.error || submit.error) {
        initiate.reset();
        submit.reset();
      }
      if (banner === 'bad_creds') setBanner(null);
    },
    [initiate, submit, banner],
  );

  const handleOtpValueChange = useCallback(
    (text: string) => {
      setConfirmCode(text);
      setLatestValueSubmitted(null);
      if (submit.error) submit.reset();
      if (stepAction.error) stepAction.reset();
    },
    [submit, stepAction],
  );

  useEffect(() => {
    if (!isOtpStep) return;
    triggerStepAction(undefined, {
      onSuccess: () => setResendCooldown(60),
      onError: (err) =>
        Logger.log('CardAuthentication::Send OTP login failed', err),
    });
  }, [isOtpStep, triggerStepAction]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const analyticsProviderId = useMemo(() => {
    if (view.mode === 'wallet' || view.mode === 'account_missing') {
      return view.option.providerId;
    }
    if (view.mode === 'email' && emailOption) {
      return emailOption.providerId;
    }
    if (view.mode === 'fork') {
      return view.options[0]?.providerId ?? null;
    }
    if (!resolution) return null;
    if ('option' in resolution) return resolution.option.providerId;
    return resolution.options[0]?.providerId ?? null;
  }, [view, emailOption, resolution]);

  useEffect(() => {
    if (!analyticsProviderId) return;
    const screenName = isOtpStep
      ? CardScreens.OTP_AUTHENTICATION
      : CardScreens.AUTHENTICATION;
    const viewKey = `${screenName}:${analyticsProviderId}`;
    if (lastTrackedAuthView.current === viewKey) return;
    lastTrackedAuthView.current = viewKey;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(analyticsProviderId, { screen: screenName }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder, isOtpStep, analyticsProviderId]);

  const performEmailLogin = useCallback(
    async (otpCode?: string) => {
      if (!countryKey || !emailOption) return;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(emailOption.providerId, {
              action: isOtpStep
                ? CardActions.OTP_AUTHENTICATION_CONFIRM_BUTTON
                : CardActions.AUTHENTICATION_LOGIN_BUTTON,
            }),
          )
          .build(),
      );

      try {
        if (!isOtpStep) {
          selectOption(emailOption, countryKey);
          const location = mapCountryToLocation(countryKey);
          await initiate.mutateAsync(location);
        }
        const result = await submit.mutateAsync({
          type: 'email_password',
          email,
          password,
          ...(otpCode ? { otpCode } : {}),
        });

        if (result.nextStep?.type === 'otp') return;

        const link = Engine.context.CardController.getSignInLink();
        if (
          link &&
          (link.status === 'completed' || link.status === 'linked') &&
          resumeEmail
        ) {
          setBanner('moved');
          try {
            await Engine.context.CardController.logout();
          } catch (logoutError) {
            Logger.log(
              'CardAuthentication::Moved-card logout failed',
              logoutError,
            );
          }
          return;
        }

        if (result.onboardingRequired) {
          dispatch(setOnboardingId(result.onboardingRequired.sessionId));
          navigation.reset({
            index: 0,
            routes: [
              {
                name: Routes.CARD.ONBOARDING.ROOT,
                params: { cardUserPhase: result.onboardingRequired.phase },
              },
            ],
          });
          return;
        }

        if (postAuthRedirect) {
          if (postAuthRedirect.screen === Routes.HOME_TABS) {
            NavigationService.navigation?.navigate(
              postAuthRedirect.screen,
              postAuthRedirect.params,
              { pop: true },
            );
          } else {
            navigation.dispatch(
              CommonActions.navigate(
                postAuthRedirect.screen,
                postAuthRedirect.params,
              ),
            );
          }
          return;
        }

        navigation.reset({
          index: 0,
          routes: [{ name: Routes.CARD.HOME }],
        });
      } catch (err) {
        Logger.log('CardAuthentication::Login failed', err);
        if (
          err instanceof CardProviderError &&
          err.code === CardProviderErrorCode.InvalidCredentials
        ) {
          setBanner('bad_creds');
        }
      }
    },
    [
      countryKey,
      emailOption,
      isOtpStep,
      selectOption,
      initiate,
      submit,
      email,
      password,
      resumeEmail,
      navigation,
      dispatch,
      trackEvent,
      createEventBuilder,
      postAuthRedirect,
    ],
  );

  useEffect(() => {
    if (
      isOtpStep &&
      confirmCode.length === CODE_LENGTH &&
      latestValueSubmitted !== confirmCode
    ) {
      setLatestValueSubmitted(confirmCode);
      performEmailLogin(confirmCode);
    }
  }, [confirmCode, performEmailLogin, latestValueSubmitted, isOtpStep]);

  const handleWalletSignIn = useCallback(async () => {
    if (walletSignInLock.current) return;
    if (!walletOption || !countryKey) return;
    const address =
      view.mode === 'wallet' && view.address ? view.address : selectedAddress;
    if (!address) return;

    if (view.mode === 'wallet' && view.origin === 'linked' && accountMismatch) {
      return;
    }

    walletSignInLock.current = true;
    setWalletSubmitting(true);
    try {
      if (view.mode === 'wallet' && view.origin === 'manual') {
        const verify = await verifyAccount(address, walletOption);
        if (verify === 'not_found') {
          setBanner('no_card');
          return;
        }
        if (verify === 'unknown') {
          setWalletError(
            strings('card.card_authentication.errors.account_check_failed'),
          );
          return;
        }
      }

      setWalletError(null);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(walletOption.providerId, {
              action: CardActions.AUTHENTICATION_LOGIN_BUTTON,
            }),
          )
          .build(),
      );
      await signInWithWallet({
        option: walletOption,
        address,
        country: countryKey,
      });
    } catch (err) {
      if (
        err instanceof CardProviderError &&
        err.code === CardProviderErrorCode.NotFound
      ) {
        setBanner('no_card');
      } else {
        setWalletError(getCardProviderErrorMessage(err));
      }
    } finally {
      walletSignInLock.current = false;
      setWalletSubmitting(false);
    }
  }, [
    walletOption,
    countryKey,
    view,
    selectedAddress,
    accountMismatch,
    verifyAccount,
    signInWithWallet,
    trackEvent,
    createEventBuilder,
  ]);

  const openAccountSelector = useCallback(() => {
    navigateWithDetails(
      navigation,
      createAccountSelectorNavDetails({
        isEvmOnly: true,
        isSelectOnly: true,
        disableAddAccountButton: true,
      }),
    );
  }, [navigation]);

  useEffect(() => {
    if (
      view.mode !== 'wallet' ||
      view.origin !== 'linked' ||
      !selectedAddress ||
      !view.address
    ) {
      setAccountMismatch(false);
      return;
    }
    if (selectedAddress.toLowerCase() === view.address.toLowerCase()) {
      setAccountMismatch(false);
      return;
    }
    setAccountMismatch(true);
  }, [view, selectedAddress]);

  const handleCountrySelect = useCallback(() => {
    if (countryLocked || isLoadingRegions) return;
    setOnValueChange((region) => {
      hasAutoSelectedCountry.current = true;
      setSelectedCountry(region);
      Engine.context.CardController.setUserLocation(
        mapCountryToLocation(region.key),
      );
    });
    navigateWithDetails(
      navigation,
      createRegionSelectorModalNavigationDetails({
        regions: allRegions,
        selectedRegionKey: selectedCountry?.key ?? null,
      }),
    );
  }, [
    countryLocked,
    isLoadingRegions,
    navigation,
    allRegions,
    selectedCountry?.key,
  ]);

  const handleResendOtp = useCallback(() => {
    if (resendCooldown > 0 || otpLoading) return;
    triggerStepAction(undefined, {
      onSuccess: () => setResendCooldown(60),
      onError: (err) =>
        Logger.log('CardAuthentication::Resend OTP failed', err),
    });
  }, [resendCooldown, triggerStepAction, otpLoading]);

  const handleBackToLogin = useCallback(() => {
    setConfirmCode('');
    setLatestValueSubmitted(null);
    setResendCooldown(60);
    setBanner(null);
    resetToLogin();
  }, [resetToLogin]);

  const handleForgotPassword = useCallback(() => {
    if (!emailOption || !countryKey) return;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(emailOption.providerId, {
            action: CardActions.AUTHENTICATION_FORGOT_PASSWORD,
          }),
        )
        .build(),
    );
    navigation.navigate(Routes.CARD.MODALS.ID, {
      screen: Routes.CARD.MODALS.FORGOT_PASSWORD,
      params: { location: mapCountryToLocation(countryKey) },
    });
  }, [navigation, trackEvent, createEventBuilder, emailOption, countryKey]);

  const handlePrimary = useCallback(() => {
    if (view.mode === 'otp') {
      performEmailLogin(confirmCode);
      return;
    }
    if (view.mode === 'wallet') {
      handleWalletSignIn();
      return;
    }
    if (view.mode === 'email') {
      performEmailLogin();
    }
  }, [view.mode, confirmCode, performEmailLogin, handleWalletSignIn]);

  const title = useMemo(() => {
    if (view.mode === 'otp')
      return strings('card.card_otp_authentication.title');
    if (view.mode === 'wallet' && view.origin === 'resume') {
      return strings('card.card_authentication.title_resume');
    }
    return strings('card.card_authentication.title');
  }, [view]);

  const description = useMemo(() => {
    if (view.mode === 'otp') {
      return maskedPhoneNumber
        ? strings(
            'card.card_otp_authentication.description_with_phone_number',
            { maskedPhoneNumber },
          )
        : strings(
            'card.card_otp_authentication.description_without_phone_number',
          );
    }
    if (view.mode === 'resolving') {
      return strings('card.card_authentication.description_resolving');
    }
    if (view.mode === 'wallet' && view.origin === 'resume') {
      return strings('card.card_authentication.description_resume');
    }
    return strings('card.card_authentication.description');
  }, [view, maskedPhoneNumber]);

  const ctaLabel = useMemo(() => {
    if (view.mode === 'otp') {
      return strings('card.card_otp_authentication.confirm_button');
    }
    if (view.mode === 'wallet') {
      return view.origin === 'resume'
        ? strings('card.card_authentication.continue_button')
        : strings('card.card_authentication.siwe_button');
    }
    return strings('card.card_authentication.login_button');
  }, [view]);

  const ctaDisabled = useMemo(() => {
    if (
      view.mode === 'resolving' ||
      view.mode === 'account_missing' ||
      view.mode === 'fork' ||
      view.mode === 'awaiting_country'
    ) {
      return true;
    }
    if (view.mode === 'otp') {
      return confirmCode.length < CODE_LENGTH || loading;
    }
    if (view.mode === 'wallet') {
      return (
        walletSubmitting ||
        accountMismatch ||
        !displayAccountAddress ||
        !walletOption
      );
    }
    if (view.mode === 'email') {
      return (
        !!error ||
        email.length === 0 ||
        password.length === 0 ||
        loading ||
        !emailOption
      );
    }
    return true;
  }, [
    view.mode,
    confirmCode,
    loading,
    walletSubmitting,
    accountMismatch,
    displayAccountAddress,
    walletOption,
    error,
    email,
    password,
    emailOption,
  ]);

  const showSignupWithCta =
    view.mode === 'email' ||
    (view.mode === 'wallet' && view.origin === 'manual');

  const formFields = (() => {
    if (view.mode === 'otp') {
      return (
        <SignInOtpFields
          confirmCode={confirmCode}
          error={error}
          otpError={otpError}
          resendCooldown={resendCooldown}
          otpLoading={otpLoading}
          isScreenTransitionComplete={isScreenTransitionComplete}
          onChangeCode={handleOtpValueChange}
          onResend={handleResendOtp}
        />
      );
    }

    return (
      <>
        {showAuthPrompt && (
          <CardMessageBox messageType={CardMessageBoxType.AuthPrompt} />
        )}

        <SignInCountryField
          selectedCountry={selectedCountry}
          isLocked={countryLocked}
          isLoading={isLoadingRegions}
          onPress={handleCountrySelect}
        />

        {view.mode === 'resolving' && <SignInSkeleton />}

        {view.mode === 'wallet' && view.origin === 'resume' && (
          <SignInResumeProgress />
        )}

        {view.mode === 'fork' && (
          <SignInFork
            reason={view.reason}
            onSelectEmail={() => setUkMode('email')}
            onSelectWallet={() => setUkMode('wallet')}
            onTryAgain={retry}
            onNotSure={() =>
              navigateWithDetails(
                navigation,
                createSignInHelpNavigationDetails(),
              )
            }
          />
        )}

        {activeBanner && (
          <SignInBanner
            banner={activeBanner}
            deadline={ukMigrationState.deadline}
            showMovedAction={!!(walletOption ?? movedWalletOption)}
            onChooseAccount={openAccountSelector}
            onImportSrp={() => navigation.navigate(Routes.MULTI_SRP.IMPORT)}
            onMovedAction={() => {
              setBanner(null);
              setResumeEmail(false);
              setUkMode('wallet');
            }}
          />
        )}

        {view.mode === 'email' && (
          <SignInEmailFields
            origin={view.origin}
            email={email}
            password={password}
            isPasswordVisible={isPasswordVisible}
            isForgotPasswordEnabled={isForgotPasswordEnabled}
            onEmailChange={handleEmailChange}
            onPasswordChange={handlePasswordChange}
            onTogglePasswordVisibility={() =>
              setIsPasswordVisible(!isPasswordVisible)
            }
            onSubmitEditing={() => performEmailLogin()}
            onForgotPassword={handleForgotPassword}
            onBack={() => {
              if (view.origin === 'resume') {
                setResumeEmail(false);
                setBanner(null);
              } else {
                setUkMode(null);
              }
            }}
          />
        )}

        {view.mode === 'wallet' && (
          <SignInWalletFields
            origin={view.origin}
            displayAccountLabel={displayAccountLabel}
            displayAccountAddress={displayAccountAddress}
            avatarAccountType={avatarAccountType}
            accountMismatch={accountMismatch}
            walletError={walletError}
            showSoftLink={
              view.origin === 'resume' && ukMigrationState.phase === 'soft'
            }
            onBack={() => setUkMode(null)}
            onSelectAccount={openAccountSelector}
            onUseCurrentCard={() => {
              setResumeEmail(true);
              setBanner('resume_soft');
            }}
          />
        )}
      </>
    );
  })();

  const actions =
    view.mode === 'otp' ? (
      <>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={() => performEmailLogin(confirmCode)}
          isLoading={loading}
          isDisabled={
            loading || !confirmCode || confirmCode.length < CODE_LENGTH
          }
          isFullWidth
          testID={CardAuthenticationSelectors.OTP_CONFIRM_BUTTON}
        >
          {strings('card.card_otp_authentication.confirm_button')}
        </Button>
        <TouchableOpacity
          onPress={handleBackToLogin}
          testID={CardAuthenticationSelectors.OTP_BACK_TO_LOGIN_BUTTON}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-default text-center p-4"
          >
            {strings('card.card_otp_authentication.back_to_login_button')}
          </Text>
        </TouchableOpacity>
      </>
    ) : (
      <Box twClassName="flex flex-col justify-center gap-2">
        {error && view.mode === 'email' && (
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-error-default"
            testID={CardAuthenticationSelectors.LOGIN_ERROR_TEXT}
          >
            {error}
          </Text>
        )}
        {view.mode !== 'fork' &&
          view.mode !== 'account_missing' &&
          view.mode !== 'resolving' && (
            <Box>
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                testID={CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON}
                onPress={handlePrimary}
                isLoading={view.mode === 'wallet' ? walletSubmitting : loading}
                isFullWidth
                isDisabled={ctaDisabled}
              >
                {ctaLabel}
              </Button>
              {showSignupWithCta && (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(Routes.CARD.ONBOARDING.ROOT)
                  }
                >
                  <Text
                    testID={CardAuthenticationSelectors.SIGNUP_BUTTON}
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    twClassName="text-default text-center p-4"
                  >
                    {strings('card.card_authentication.signup_button')}
                  </Text>
                </TouchableOpacity>
              )}
            </Box>
          )}
        {view.mode === 'fork' && (
          <TouchableOpacity
            onPress={() => navigation.navigate(Routes.CARD.ONBOARDING.ROOT)}
          >
            <Text
              testID={CardAuthenticationSelectors.SIGNUP_BUTTON}
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              twClassName="text-default text-center p-4"
            >
              {strings('card.card_authentication.signup_button')}
            </Text>
          </TouchableOpacity>
        )}
      </Box>
    );

  return (
    <OnboardingStep
      title={title}
      description={description}
      formFields={formFields}
      actions={actions}
      headerMode="back"
    />
  );
};

export default CardAuthentication;
