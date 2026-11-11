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
import { AccessibilityInfo, TouchableOpacity } from 'react-native';
import {
  FontWeight,
  HelpText,
  HelpTextSeverity,
  Text,
  TextVariant,
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
import {
  selectCardBaanxPasswordlessLoginEnabled,
  selectCardForgotPasswordFeatureEnabled,
  selectCardImmersveCountries,
} from '../../../../../selectors/featureFlagController/card';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { useIsImmersveMoneyAccountCountry } from '../../hooks/useImmersveFundingChannel';
import { MoneyAccountRequired } from '../../components/MoneyAccountRow/MoneyAccountRow';
import { CardMessageBoxType, type Region } from '../../types';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import {
  CardProviderError,
  CardProviderErrorCode,
  CardProviderIds,
  type CardSignInOption,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import OnboardingStep from '../../components/Onboarding/OnboardingStep';
import NavigationService from '../../../../../core/NavigationService';
import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { selectAccountToGroupMap } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { safeToChecksumAddress } from '../../../../../util/address';
import { useAccountGroupName } from '../../../../hooks/multichainAccounts/useAccountGroupName';
import { createAccountSelectorNavDetails } from '../../../../Views/AccountSelector';
import { navigateWithDetails } from '../../../../../util/navigation/navUtils';
import { getCardProviderErrorMessage } from '../../util/getCardProviderErrorMessage';
import useRegions from '../../hooks/useRegions';
import { selectGeolocationLocation } from '../../../../../selectors/geolocationController';
import { mapCountryToLocation } from '../../util/mapCountryToLocation';
import { filterCardSignInRegions } from '../../util/signInRegions';
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
  resolveActiveBanner,
  resolveAuthView,
  resolveDisplayedWalletAddress,
  type AuthBanner,
  type AuthView,
  type UkManualMode,
} from './resolveAuthView';
import CountrySelectField from '../../components/Onboarding/CountrySelectField';
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

function resolveSignInAccountPresentation({
  view,
  selectedAddress,
  seenLinkedAddress,
  accountsByAddress,
  accountToGroupMap,
  fallbackAccountName,
}: {
  view: AuthView;
  selectedAddress: string | undefined;
  seenLinkedAddress: string | null;
  accountsByAddress: ReturnType<typeof selectInternalAccountByAddresses>;
  accountToGroupMap: ReturnType<typeof selectAccountToGroupMap>;
  fallbackAccountName: string | null;
}) {
  const pinnedDisplayAddress =
    view.mode === 'wallet' && view.address ? view.address : null;
  const linkedPinnedKey =
    view.mode === 'wallet' && view.origin === 'linked' && view.address
      ? view.address.toLowerCase()
      : null;
  const nextSeenLinkedAddress =
    linkedPinnedKey && selectedAddress?.toLowerCase() === linkedPinnedKey
      ? linkedPinnedKey
      : seenLinkedAddress;
  const displayAccountAddress = resolveDisplayedWalletAddress({
    origin: view.mode === 'wallet' ? view.origin : null,
    pinnedAddress: pinnedDisplayAddress,
    selectedAddress,
    hasShownPinnedSelection:
      linkedPinnedKey !== null && nextSeenLinkedAddress === linkedPinnedKey,
  });
  const displayAccount = displayAccountAddress
    ? accountsByAddress([displayAccountAddress])[0]
    : undefined;
  const displayAccountLabel =
    (displayAccount
      ? accountToGroupMap[displayAccount.id]?.metadata?.name ||
        displayAccount.metadata?.name
      : undefined) ||
    fallbackAccountName ||
    undefined;

  return {
    displayAccountAddress,
    displayAccountLabel,
    nextSeenLinkedAddress,
  };
}

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
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Region | null>(null);
  const hasAutoSelectedCountry = useRef(false);
  const walletSignInLock = useRef(false);
  const emailCodeRequestId = useRef(0);
  const emailAuthLock = useRef(false);
  const submittedEmailCodeRef = useRef('');
  const clearAuthFailureRef = useRef<() => void>(() => undefined);
  const [emailLoginAttempt, setEmailLoginAttempt] = useState(0);
  const geoLocation = useSelector(selectGeolocationLocation);
  const isForgotPasswordEnabled = useSelector(
    selectCardForgotPasswordFeatureEnabled,
  );
  const isPasswordlessLoginEnabled = useSelector(
    selectCardBaanxPasswordlessLoginEnabled,
  );
  const immersveCountries = useSelector(selectCardImmersveCountries);
  const { allRegions, isLoading: isLoadingRegions } = useRegions();
  const signInRegions = useMemo(
    () => filterCardSignInRegions(allRegions, immersveCountries),
    [allRegions, immersveCountries],
  );
  const { state: ukMigrationState } = useCardUkMigrationState();

  const countryKey = selectedCountry?.key ?? null;
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const isMoneyAccountMode = useIsImmersveMoneyAccountCountry(countryKey);
  const moneyAccountAddress = safeToChecksumAddress(
    primaryMoneyAccount?.address,
  );
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
  const [walletSubmitting, setWalletSubmitting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [latestValueSubmitted, setLatestValueSubmitted] = useState<
    string | null
  >(null);
  const [latestEmailCodeSubmitted, setLatestEmailCodeSubmitted] = useState<
    string | null
  >(null);
  const [resendCooldown, setResendCooldown] = useState(60);
  const dispatch = useDispatch();
  const lastTrackedAuthView = useRef<string | null>(null);
  const seenLinkedAddressRef = useRef<string | null>(null);

  const accountName = useAccountGroupName();
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const selectedAddress = safeToChecksumAddress(
    selectAccountByScope('eip155:0')?.address,
  );
  const accountsByAddress = useSelector(selectInternalAccountByAddresses);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);

  const {
    currentStep,
    initiate,
    submit,
    stepAction,
    requestEmailCode,
    resetToLogin,
    getErrorMessage,
  } = useCardAuth();
  const { mutate: triggerStepAction } = stepAction;

  const isOtpStep = currentStep.type === 'otp';
  const otpMode = currentStep.type === 'otp' ? currentStep.mode : undefined;
  const loading =
    initiate.isPending || submit.isPending || requestEmailCode.isPending;
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
  const showMoneyAccountRequired =
    isMoneyAccountMode &&
    !moneyAccountAddress &&
    (view.mode === 'fork' || view.mode === 'wallet');

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

  const isBaanxPasswordless =
    isPasswordlessLoginEnabled &&
    emailOption?.providerId === CardProviderIds.Baanx;
  const authFailure = initiate.error ?? submit.error;
  const loginError =
    isBaanxPasswordless &&
    authFailure instanceof CardProviderError &&
    authFailure.code === CardProviderErrorCode.InvalidCredentials
      ? strings('card.card_authentication.errors.invalid_otp_code')
      : error;
  const displayedLoginError =
    loginError ??
    (requestEmailCode.error ? getErrorMessage(requestEmailCode.error) : null);

  useEffect(() => {
    if (!displayedLoginError || view.mode !== 'email') {
      return;
    }
    AccessibilityInfo.announceForAccessibility(displayedLoginError);
  }, [displayedLoginError, view.mode]);

  const resolvedAccount = resolveSignInAccountPresentation({
    view,
    selectedAddress,
    seenLinkedAddress: seenLinkedAddressRef.current,
    accountsByAddress,
    accountToGroupMap,
    fallbackAccountName: accountName,
  });
  seenLinkedAddressRef.current = resolvedAccount.nextSeenLinkedAddress;
  const displayAccountAddress = isMoneyAccountMode
    ? moneyAccountAddress
    : resolvedAccount.displayAccountAddress;
  const displayAccountLabel = isMoneyAccountMode
    ? strings('card.card_spending_limit.money_account_label')
    : resolvedAccount.displayAccountLabel;

  useEffect(() => {
    if (!signInRegions.length || hasAutoSelectedCountry.current) {
      return;
    }
    if (geoLocation === 'UNKNOWN') {
      return;
    }
    const matched = signInRegions.find((region) => region.key === geoLocation);
    if (matched) {
      hasAutoSelectedCountry.current = true;
      setSelectedCountry(matched);
      Engine.context.CardController.setUserLocation(
        mapCountryToLocation(matched.key),
      );
    }
  }, [signInRegions, geoLocation]);

  const resetTransientAuthState = useCallback(() => {
    setUkMode(null);
    setResumeEmail(false);
    setBanner(null);
    setWalletError(null);
  }, []);

  useEffect(() => {
    resetTransientAuthState();
    emailCodeRequestId.current += 1;
    setEmailCode('');
    setEmailCodeSent(false);
    setLatestEmailCodeSubmitted(null);
    clearAuthFailureRef.current();
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

  const clearAuthFailure = useCallback(() => {
    if (initiate.error) initiate.reset();
    if (submit.error) submit.reset();
    if (requestEmailCode.error) requestEmailCode.reset();
    setBanner((current) => (current === 'bad_creds' ? null : current));
  }, [initiate, submit, requestEmailCode]);
  clearAuthFailureRef.current = clearAuthFailure;

  const handleEmailChange = useCallback(
    (newEmail: string) => {
      emailCodeRequestId.current += 1;
      setEmail(newEmail);
      setEmailCode('');
      setEmailCodeSent(false);
      setLatestEmailCodeSubmitted(null);
      clearAuthFailure();
    },
    [clearAuthFailure],
  );

  const handlePasswordChange = useCallback(
    (newPassword: string) => {
      setPassword(newPassword);
      clearAuthFailure();
    },
    [clearAuthFailure],
  );

  const handleEmailCodeChange = useCallback(
    (value: string) => {
      setEmailCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH));
      setLatestEmailCodeSubmitted(null);
      clearAuthFailure();
    },
    [clearAuthFailure],
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
    if (!isOtpStep || otpMode === 'TOTP') return;
    triggerStepAction(undefined, {
      onSuccess: () => setResendCooldown(60),
      onError: (err) =>
        Logger.log('CardAuthentication::Send OTP login failed', err),
    });
  }, [isOtpStep, otpMode, triggerStepAction]);

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
      const passwordlessEmailCodeLogin = isBaanxPasswordless && !isOtpStep;
      if (passwordlessEmailCodeLogin && emailAuthLock.current) return;
      if (passwordlessEmailCodeLogin) {
        emailAuthLock.current = true;
        submittedEmailCodeRef.current = emailCode;
      }

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

      let emailCodeLoginSettled = false;
      try {
        if (isBaanxPasswordless) {
          clearAuthFailure();
        }
        if (!isOtpStep) {
          selectOption(emailOption, countryKey);
          const location = mapCountryToLocation(countryKey);
          await initiate.mutateAsync(location);
        }
        const result = await submit.mutateAsync(
          isBaanxPasswordless
            ? {
                type: 'email_code',
                email: email.trim(),
                code: isOtpStep
                  ? submittedEmailCodeRef.current || emailCode
                  : emailCode,
                ...(otpCode ? { otpCode } : {}),
              }
            : {
                type: 'email_password',
                email,
                password,
                ...(otpCode ? { otpCode } : {}),
              },
        );
        if (passwordlessEmailCodeLogin) {
          emailCodeLoginSettled = true;
        }

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
      } finally {
        if (passwordlessEmailCodeLogin) {
          emailAuthLock.current = false;
          if (!emailCodeLoginSettled) {
            setEmailLoginAttempt((attempt) => attempt + 1);
          }
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
      emailCode,
      isBaanxPasswordless,
      resumeEmail,
      navigation,
      dispatch,
      trackEvent,
      createEventBuilder,
      postAuthRedirect,
      clearAuthFailure,
    ],
  );

  useEffect(() => {
    if (
      isOtpStep &&
      confirmCode.length === CODE_LENGTH &&
      latestValueSubmitted !== confirmCode
    ) {
      setLatestValueSubmitted(confirmCode);
      void performEmailLogin(confirmCode);
    }
  }, [confirmCode, performEmailLogin, latestValueSubmitted, isOtpStep]);

  // Auto-submit when all digits are entered
  useEffect(() => {
    if (
      !isBaanxPasswordless ||
      !emailCodeSent ||
      isOtpStep ||
      emailAuthLock.current ||
      emailCode.length !== CODE_LENGTH ||
      latestEmailCodeSubmitted === emailCode
    ) {
      return;
    }
    setLatestEmailCodeSubmitted(emailCode);
    void performEmailLogin();
  }, [
    emailCode,
    emailCodeSent,
    emailLoginAttempt,
    isBaanxPasswordless,
    isOtpStep,
    latestEmailCodeSubmitted,
    performEmailLogin,
  ]);

  const handleWalletSignIn = useCallback(async () => {
    if (walletSignInLock.current) return;

    const signInAddress = displayAccountAddress;
    if (!walletOption || !countryKey || !signInAddress) return;

    const pinnedAddress =
      view.mode === 'wallet' && view.address ? view.address : null;
    const signingAwayFromLinked =
      view.mode === 'wallet' &&
      view.origin === 'linked' &&
      pinnedAddress !== null &&
      signInAddress.toLowerCase() !== pinnedAddress.toLowerCase();
    const shouldVerifyAccount =
      view.mode === 'wallet' &&
      (view.origin === 'manual' || signingAwayFromLinked);

    walletSignInLock.current = true;
    setWalletSubmitting(true);
    try {
      if (shouldVerifyAccount) {
        const verify = await verifyAccount(signInAddress, walletOption);
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
        address: signInAddress,
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
    displayAccountAddress,
    verifyAccount,
    signInWithWallet,
    trackEvent,
    createEventBuilder,
  ]);

  const handleSignUpPress = useCallback(() => {
    navigation.navigate(Routes.CARD.ONBOARDING.ROOT, undefined, {
      pop: true,
      merge: true,
    });
  }, [navigation]);

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

  const switchedForAddressRef = useRef<string | null>(null);
  useEffect(() => {
    if (isMoneyAccountMode) {
      return;
    }
    if (
      view.mode !== 'wallet' ||
      (view.origin !== 'linked' && view.origin !== 'resume') ||
      !view.address
    ) {
      return;
    }

    const pinned = view.address.toLowerCase();
    if (switchedForAddressRef.current === pinned) {
      return;
    }

    if (selectedAddress?.toLowerCase() === pinned) {
      switchedForAddressRef.current = pinned;
      return;
    }

    const pinnedAccount = accountsByAddress([view.address])[0];
    const groupId = pinnedAccount
      ? accountToGroupMap[pinnedAccount.id]?.id
      : undefined;
    if (!groupId) {
      return;
    }

    switchedForAddressRef.current = pinned;
    Engine.context.AccountTreeController.setSelectedAccountGroup(groupId);
  }, [
    view,
    selectedAddress,
    accountsByAddress,
    accountToGroupMap,
    isMoneyAccountMode,
  ]);

  const handleCountrySelect = useCallback(() => {
    if (isLoadingRegions) return;
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
        regions: signInRegions,
        selectedRegionKey: selectedCountry?.key ?? null,
      }),
    );
  }, [isLoadingRegions, navigation, signInRegions, selectedCountry?.key]);

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

  const handleRequestEmailCode = useCallback(async () => {
    const requestedEmail = email.trim();
    if (
      !countryKey ||
      !emailOption ||
      !requestedEmail ||
      loading ||
      emailAuthLock.current
    ) {
      return;
    }
    const requestId = emailCodeRequestId.current;
    emailAuthLock.current = true;
    selectOption(emailOption, countryKey);
    clearAuthFailure();
    try {
      await initiate.mutateAsync(mapCountryToLocation(countryKey));
      await requestEmailCode.mutateAsync(requestedEmail);
      if (requestId !== emailCodeRequestId.current) return;
      setEmailCode('');
      setLatestEmailCodeSubmitted(null);
      setEmailCodeSent(true);
      setResendCooldown(60);
    } catch (err) {
      if (requestId !== emailCodeRequestId.current) {
        initiate.reset();
        requestEmailCode.reset();
        return;
      }
      Logger.log('CardAuthentication::Request email code failed', err);
    } finally {
      emailAuthLock.current = false;
      setEmailLoginAttempt((attempt) => attempt + 1);
    }
  }, [
    countryKey,
    email,
    emailOption,
    initiate,
    loading,
    requestEmailCode,
    selectOption,
    clearAuthFailure,
  ]);

  const handleResendEmailCode = useCallback(() => {
    if (resendCooldown > 0 || loading) return;
    void handleRequestEmailCode();
  }, [resendCooldown, loading, handleRequestEmailCode]);

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
      void performEmailLogin(confirmCode);
      return;
    }
    if (view.mode === 'wallet') {
      void handleWalletSignIn();
      return;
    }
    if (view.mode === 'email') {
      if (isBaanxPasswordless && !emailCodeSent) {
        void handleRequestEmailCode();
        return;
      }
      void performEmailLogin();
    }
  }, [
    view.mode,
    confirmCode,
    performEmailLogin,
    handleWalletSignIn,
    isBaanxPasswordless,
    emailCodeSent,
    handleRequestEmailCode,
  ]);

  const title = useMemo(() => {
    if (view.mode === 'otp') {
      return strings(
        otpMode === 'TOTP'
          ? 'card.card_otp_authentication.title_authenticator'
          : 'card.card_otp_authentication.title',
      );
    }
    if (view.mode === 'wallet' && view.origin === 'resume') {
      return strings('card.card_authentication.title_resume');
    }
    return strings('card.card_authentication.title');
  }, [view, otpMode]);

  const description = useMemo(() => {
    if (view.mode === 'otp') {
      if (otpMode === 'TOTP') {
        return strings(
          'card.card_otp_authentication.description_authenticator',
        );
      }
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
  }, [view, maskedPhoneNumber, otpMode]);

  const ctaLabel = useMemo(() => {
    if (view.mode === 'otp') {
      return strings('card.card_otp_authentication.confirm_button');
    }
    if (view.mode === 'wallet' && view.origin === 'resume') {
      return strings('card.card_authentication.continue_button');
    }
    if (view.mode === 'email' && isBaanxPasswordless && !emailCodeSent) {
      return strings('card.card_authentication.request_email_code_button');
    }
    return strings('card.card_authentication.login_button');
  }, [view, isBaanxPasswordless, emailCodeSent]);

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
      return walletSubmitting || !displayAccountAddress || !walletOption;
    }
    if (view.mode === 'email') {
      if (isBaanxPasswordless) {
        if (!emailCodeSent) {
          return email.trim().length === 0 || loading || !emailOption;
        }
        return emailCode.length < CODE_LENGTH || loading || !emailOption;
      }
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
    displayAccountAddress,
    walletOption,
    error,
    email,
    password,
    emailCode,
    emailCodeSent,
    isBaanxPasswordless,
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
          error={loginError}
          otpError={otpError}
          resendCooldown={resendCooldown}
          otpLoading={otpLoading}
          showResend={otpMode !== 'TOTP'}
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

        <CountrySelectField
          label={strings('card.card_authentication.country_label')}
          selectedCountry={selectedCountry}
          isLoading={isLoadingRegions}
          onPress={handleCountrySelect}
          testID={CardAuthenticationSelectors.COUNTRY_SELECT}
        />

        {view.mode === 'resolving' && <SignInSkeleton />}

        {view.mode === 'wallet' && view.origin === 'resume' && (
          <SignInResumeProgress
            stage={resolution?.kind === 'resume' ? resolution.stage : null}
          />
        )}

        {view.mode === 'fork' && !showMoneyAccountRequired && (
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

        {showMoneyAccountRequired && (
          <>
            <MoneyAccountRequired returnTo="authentication" />
            {emailOption ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setUkMode('email')}
                testID={CardAuthenticationSelectors.MONEY_ACCOUNT_EMAIL_LINK}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  twClassName="text-default text-center p-4"
                >
                  {strings('card.card_authentication.fork_email_title')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}

        {activeBanner && (
          <SignInBanner
            banner={activeBanner}
            deadline={ukMigrationState.deadline}
            showMovedAction={!!(walletOption ?? movedWalletOption)}
            bodyKey={
              isBaanxPasswordless && activeBanner === 'bad_creds'
                ? 'card.card_authentication.banner_bad_code_body'
                : undefined
            }
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
            usesEmailCode={isBaanxPasswordless}
            showEmailCode={emailCodeSent}
            emailCode={emailCode}
            resendCooldown={resendCooldown}
            isRequestingCode={loading}
            onEmailChange={handleEmailChange}
            onEmailCodeChange={handleEmailCodeChange}
            onResendEmailCode={handleResendEmailCode}
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

        {view.mode === 'wallet' && !showMoneyAccountRequired && (
          <SignInWalletFields
            origin={view.origin}
            displayAccountLabel={displayAccountLabel}
            displayAccountAddress={displayAccountAddress}
            avatarAccountType={avatarAccountType}
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
            lockToMoneyAccount={isMoneyAccountMode}
          />
        )}
      </>
    );
  })();

  const signUpButtonProps = {
    children: strings('card.card_authentication.signup_button'),
    onPress: handleSignUpPress,
    testID: CardAuthenticationSelectors.SIGNUP_BUTTON,
  };

  const showPrimaryCta =
    view.mode !== 'fork' &&
    view.mode !== 'account_missing' &&
    view.mode !== 'resolving';

  const primaryButtonProps =
    view.mode === 'otp'
      ? {
          children: strings('card.card_otp_authentication.confirm_button'),
          onPress: () => performEmailLogin(confirmCode),
          isLoading: loading,
          isDisabled:
            loading || !confirmCode || confirmCode.length < CODE_LENGTH,
          testID: CardAuthenticationSelectors.OTP_CONFIRM_BUTTON,
        }
      : showPrimaryCta
        ? {
            children: ctaLabel,
            onPress: handlePrimary,
            isLoading: view.mode === 'wallet' ? walletSubmitting : loading,
            isDisabled: ctaDisabled,
            testID: CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
          }
        : undefined;

  const tertiaryButtonProps =
    view.mode === 'otp'
      ? {
          children: strings(
            'card.card_otp_authentication.back_to_login_button',
          ),
          onPress: handleBackToLogin,
          testID: CardAuthenticationSelectors.OTP_BACK_TO_LOGIN_BUTTON,
        }
      : (showPrimaryCta && showSignupWithCta) || view.mode === 'fork'
        ? signUpButtonProps
        : undefined;

  const loginErrorText =
    displayedLoginError && view.mode === 'email' ? (
      <HelpText
        severity={HelpTextSeverity.Danger}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        testID={CardAuthenticationSelectors.LOGIN_ERROR_TEXT}
      >
        {displayedLoginError}
      </HelpText>
    ) : null;

  return (
    <OnboardingStep
      title={title}
      description={description}
      formFields={
        <>
          {formFields}
          {loginErrorText}
        </>
      }
      primaryButtonProps={primaryButtonProps}
      tertiaryButtonProps={tertiaryButtonProps}
      headerMode="back"
    />
  );
};

export default CardAuthentication;
