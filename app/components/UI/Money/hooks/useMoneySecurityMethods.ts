import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setMoneySmsPhoneNumber,
  setOnboardingStepperStep,
} from '../../../../actions/user';
import {
  selectMoneySmsPhoneNumber,
  selectOnboardingStepperProgress,
} from '../../../../reducers/user/selectors';
import {
  selectSeedlessOnboardingAuthConnection,
  selectSeedlessOnboardingLoginFlow,
  selectSeedlessOnboardingUserEmail,
  selectSeedlessOnboardingUserId,
} from '../../../../selectors/seedlessOnboardingController';
import {
  selectOnboardingAccountType,
  selectOnboardingSeedlessAuthConnection,
} from '../../../../selectors/onboarding';
import { AccountType } from '../../../../constants/onboarding';
import { AuthConnection } from '../../../../core/OAuthService/OAuthInterface';
import {
  getMoneySocialProviderFromCode,
  MONEY_SOCIAL_DEMO_ACCOUNTS,
  MONEY_SOCIAL_PROVIDER_CODES,
  type MoneySocialProvider,
} from '../constants/moneySocial';
import { STEPPER_IDS } from './useOnboardingStep';

export type MoneyDefaultVerificationMethod =
  | 'passkeys'
  | 'authenticator'
  | 'sms';

export const MONEY_DEFAULT_VERIFICATION_METHOD_LABEL_KEYS: Record<
  MoneyDefaultVerificationMethod,
  string
> = {
  passkeys: 'money.security.default_method_passkeys',
  authenticator: 'money.security.default_method_authenticator',
  sms: 'money.security.default_method_sms',
};

export const hasVerificationMethodsAfterRemoval = (
  passkeyCount: number,
  hasOtherMethod: boolean,
) => passkeyCount > 0 || hasOtherMethod;

const SOCIAL_LOGIN_ACCOUNT_TYPES = new Set<AccountType>([
  AccountType.MetamaskGoogle,
  AccountType.ImportedGoogle,
  AccountType.MetamaskApple,
  AccountType.ImportedApple,
  AccountType.MetamaskTelegram,
  AccountType.ImportedTelegram,
]);

export const useMoneySecurityMethods = (passkeyCount = 0) => {
  const dispatch = useDispatch();
  const progress = useSelector(selectOnboardingStepperProgress);
  const hasSeedlessVault = useSelector(selectSeedlessOnboardingLoginFlow);
  const seedlessUserId = useSelector(selectSeedlessOnboardingUserId);
  const onboardingAccountType = useSelector(selectOnboardingAccountType);
  const persistedSocialLoginProvider = useSelector(
    selectOnboardingSeedlessAuthConnection,
  );
  const socialLoginProvider = useSelector(
    selectSeedlessOnboardingAuthConnection,
  );
  const socialLoginEmail = useSelector(selectSeedlessOnboardingUserEmail);
  const effectiveSocialLoginProvider =
    socialLoginProvider ?? persistedSocialLoginProvider;
  const hasPrototypeSocial = progress[STEPPER_IDS.MONEY_SECURITY_SOCIAL] === 1;
  const isPrototypeSocialLoginWallet =
    progress[STEPPER_IDS.MONEY_RECOVERY_SOCIAL_LOGIN_WALLET] === 1;
  const isSocialLogin = onboardingAccountType
    ? SOCIAL_LOGIN_ACCOUNT_TYPES.has(onboardingAccountType)
    : Boolean(
        hasSeedlessVault ||
          seedlessUserId ||
          effectiveSocialLoginProvider ||
          socialLoginEmail ||
          isPrototypeSocialLoginWallet,
      );
  const isSocialAdded =
    hasPrototypeSocial ||
    (isSocialLogin &&
      progress[STEPPER_IDS.MONEY_SECURITY_SOCIAL_REMOVED] !== 1);
  const socialProvider: MoneySocialProvider = hasPrototypeSocial
    ? getMoneySocialProviderFromCode(
        progress[STEPPER_IDS.MONEY_SECURITY_SOCIAL_PROVIDER] ?? 0,
      )
    : effectiveSocialLoginProvider === AuthConnection.Apple
      ? 'apple'
      : effectiveSocialLoginProvider === AuthConnection.Telegram
        ? 'telegram'
        : 'google';
  const socialCreatedAtTimestamp =
    progress[STEPPER_IDS.MONEY_SECURITY_SOCIAL_CREATED_AT];
  const socialCreatedAt = socialCreatedAtTimestamp
    ? new Date(socialCreatedAtTimestamp)
    : undefined;
  const socialAccount =
    !hasPrototypeSocial && socialLoginEmail
      ? socialLoginEmail
      : MONEY_SOCIAL_DEMO_ACCOUNTS[socialProvider];
  const isSmsAdded =
    isSocialLogin && progress[STEPPER_IDS.MONEY_SECURITY_SMS_REMOVED] !== 1;
  const smsCreatedAtTimestamp =
    progress[STEPPER_IDS.MONEY_SECURITY_SMS_CREATED_AT];
  const smsCreatedAt = smsCreatedAtTimestamp
    ? new Date(smsCreatedAtTimestamp)
    : undefined;
  const storedSmsPhoneNumber = useSelector(selectMoneySmsPhoneNumber);
  const smsPhoneNumber = storedSmsPhoneNumber || '+15555550182';
  const isAuthenticatorAdded =
    progress[STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR] === 1;
  const authenticatorCreatedAtTimestamp =
    progress[STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR_CREATED_AT];
  const authenticatorCreatedAt = authenticatorCreatedAtTimestamp
    ? new Date(authenticatorCreatedAtTimestamp)
    : undefined;
  const isTransactionVerificationEnabled =
    progress[STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION] === 1;
  const defaultVerificationMethod: MoneyDefaultVerificationMethod =
    passkeyCount > 0
      ? 'passkeys'
      : isAuthenticatorAdded
        ? 'authenticator'
        : isSmsAdded
          ? 'sms'
          : 'passkeys';

  const addSocial = useCallback(
    (provider: MoneySocialProvider = 'google') => {
      dispatch(setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SOCIAL, 1));
      dispatch(
        setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SOCIAL_REMOVED, 0),
      );
      dispatch(
        setOnboardingStepperStep(
          STEPPER_IDS.MONEY_SECURITY_SOCIAL_PROVIDER,
          MONEY_SOCIAL_PROVIDER_CODES[provider],
        ),
      );
      dispatch(
        setOnboardingStepperStep(
          STEPPER_IDS.MONEY_SECURITY_SOCIAL_CREATED_AT,
          Date.now(),
        ),
      );
    },
    [dispatch],
  );

  const removeSocial = useCallback(() => {
    dispatch(setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SOCIAL, 0));
    dispatch(
      setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SOCIAL_REMOVED, 1),
    );
    dispatch(
      setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SOCIAL_PROVIDER, 0),
    );
    dispatch(
      setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SOCIAL_CREATED_AT, 0),
    );
  }, [dispatch]);

  const addAuthenticator = useCallback(() => {
    dispatch(
      setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR, 1),
    );
    if (!isAuthenticatorAdded) {
      dispatch(
        setOnboardingStepperStep(
          STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR_CREATED_AT,
          Date.now(),
        ),
      );
    }
  }, [dispatch, isAuthenticatorAdded]);

  const removeAuthenticator = useCallback(() => {
    dispatch(
      setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR, 0),
    );
    dispatch(
      setOnboardingStepperStep(
        STEPPER_IDS.MONEY_SECURITY_AUTHENTICATOR_CREATED_AT,
        0,
      ),
    );
    if (!hasVerificationMethodsAfterRemoval(passkeyCount, isSmsAdded)) {
      dispatch(
        setOnboardingStepperStep(STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION, 0),
      );
    }
  }, [dispatch, isSmsAdded, passkeyCount]);

  const addSms = useCallback(
    (phoneNumber: string) => {
      dispatch(
        setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SMS_REMOVED, 0),
      );
      if (!isSmsAdded) {
        dispatch(
          setOnboardingStepperStep(
            STEPPER_IDS.MONEY_SECURITY_SMS_CREATED_AT,
            Date.now(),
          ),
        );
      }
      dispatch(setMoneySmsPhoneNumber(phoneNumber));
    },
    [dispatch, isSmsAdded],
  );

  const removeSms = useCallback(() => {
    dispatch(
      setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SMS_REMOVED, 1),
    );
    dispatch(
      setOnboardingStepperStep(STEPPER_IDS.MONEY_SECURITY_SMS_CREATED_AT, 0),
    );
    if (
      !hasVerificationMethodsAfterRemoval(passkeyCount, isAuthenticatorAdded)
    ) {
      dispatch(
        setOnboardingStepperStep(STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION, 0),
      );
    }
    dispatch(setMoneySmsPhoneNumber(''));
  }, [dispatch, isAuthenticatorAdded, passkeyCount]);

  const setTransactionVerificationEnabled = useCallback(
    (enabled: boolean) => {
      dispatch(
        setOnboardingStepperStep(
          STEPPER_IDS.MONEY_TRANSACTION_VERIFICATION,
          enabled ? 1 : 0,
        ),
      );
    },
    [dispatch],
  );

  return {
    addAuthenticator,
    addSms,
    addSocial,
    authenticatorCreatedAt,
    defaultVerificationMethod,
    hasAlternativeSecurityMethod: isSmsAdded || isAuthenticatorAdded,
    isAuthenticatorAdded,
    isSocialAdded,
    isSocialLogin,
    isSmsAdded,
    isTransactionVerificationEnabled,
    removeAuthenticator,
    removeSms,
    removeSocial,
    smsCreatedAt,
    smsPhoneNumber,
    socialAccount,
    socialCreatedAt,
    socialProvider,
    setTransactionVerificationEnabled,
  };
};
