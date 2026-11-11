import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type {
  KycDisclaimer,
  KycCatalogDocument,
  KycConsentDocument,
  KycVendorSessionState,
} from '@metamask/kyc-controller';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { getMfaErrorCode } from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import I18n from '../../../../../locales/i18n';
import type { RootState } from '../../../../reducers';
import { useMfa } from '../../../../util/identity/mfa';
import { toSumSubLocale } from '../utils/toSumSubLocale';
import { KALSHI_KYC_VENDOR } from '../vendors/kalshi';
import { deriveKalshiStep, type KalshiStep } from './kalshiStep';

const VENDOR = KALSHI_KYC_VENDOR.id;

export const KalshiOnboardingTestIds = {
  CONTAINER: 'kalshi-onboarding',
  INPUT: 'kalshi-onboarding-input',
  PRIMARY: 'kalshi-onboarding-primary',
  ERROR: 'kalshi-onboarding-error',
} as const;

const selectKalshiEntry = (
  state: RootState,
): KycVendorSessionState | undefined =>
  state.engine.backgroundState.KycController?.sessions?.[VENDOR];

const toKeys = (
  documents: (KycCatalogDocument | KycConsentDocument)[] | undefined,
) => (documents ?? []).map(({ key, version }) => ({ key, version }));

const getGeoCountry = (): Promise<string> => {
  const { KycService } = Engine.context;
  if (!KycService) {
    throw new Error('KYC service is unavailable');
  }
  return KycService.getGeoCountry();
};

const errorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    const { status, code } = error as Error & {
      status?: number;
      code?: string;
    };
    return [error.message, code, status].filter(Boolean).join(' · ');
  }
  return 'Something went wrong.';
};

const STEP_COPY: Record<KalshiStep, { title: string; body: string }> = {
  terms: {
    title: 'Kalshi terms',
    body: 'Review and accept Kalshi’s terms to open a Kalshi account.',
  },
  email: {
    title: 'Your email',
    body: 'Kalshi creates your account with this email and sends you a code.',
  },
  confirm: {
    title: 'Confirm with MetaMask',
    body: 'MetaMask confirms your email, then idOS opens your identity check for Kalshi.',
  },
  email_code: {
    title: 'Check your email',
    body: 'Enter the code Kalshi sent to your email.',
  },
  phone: {
    title: 'Your phone',
    body: 'Kalshi texts a code to this number. Demo: +18888888888.',
  },
  phone_code: {
    title: 'Check your phone',
    body: 'Enter the code Kalshi texted you. Demo: 888888.',
  },
  sumsub: {
    title: 'Verify your identity',
    body: 'Scan an ID and take a selfie with SumSub. idOS shares the result with Kalshi.',
  },
  waiting: {
    title: 'Verifying your identity',
    body: 'This usually takes a few minutes. You can leave and come back.',
  },
  rejected: {
    title: 'Verification failed',
    body: 'Kalshi could not verify your identity. Contact Kalshi support.',
  },
  link: {
    title: 'Link Kalshi to MetaMask',
    body: 'Your identity is approved. Link the Kalshi account to this wallet.',
  },
  link_code: {
    title: 'Confirm the link',
    body: 'Enter the code Kalshi emailed you. Demo: 888888.',
  },
  link_waiting: {
    title: 'Kalshi is finishing your account',
    body: 'Kalshi is still reviewing your identity.',
  },
  activate: {
    title: 'Activate your account',
    body: 'Set the wallet Kalshi pays withdrawals to, and finish setup.',
  },
  done: {
    title: 'Identity verified',
    body: 'Kalshi has your verified identity. Predict activates your account when you start trading.',
  },
  unsupported: {
    title: 'Can’t finish setup',
    body: 'Kalshi reported an account state this app can’t continue from.',
  },
};

/**
 * POC: Kalshi onboarding through the UKYC module. One screen, driven by
 * `sessions.kalshi`, that resumes wherever the user left off.
 */
const KalshiOnboarding = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { verifyOrEnroll } = useMfa();
  const entry = useSelector(selectKalshiEntry);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [terms, setTerms] = useState<KycDisclaimer[]>();
  const step = deriveKalshiStep(entry, { phoneCodeSent });
  const copy = STEP_COPY[step];
  const { KycController } = Engine.context;

  // Each step starts with an empty field.
  useEffect(() => {
    setInput('');
  }, [step]);

  // kyc-api decides the UKYC stage: ask it after every action, so the step
  // shown is the server's (sessions.kalshi.nextStep).
  const refreshServerStep = useCallback(
    () =>
      KycController.refreshStep({ vendor: VENDOR }).catch((caught) => {
        Logger.error(caught as Error, {
          tags: { feature: KALSHI_KYC_VENDOR.loggerFeature },
        });
      }),
    [KycController],
  );

  useEffect(() => {
    refreshServerStep();
  }, [refreshServerStep]);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setBusy(true);
      setError(undefined);
      try {
        await action();
        await refreshServerStep();
      } catch (caught) {
        if (getMfaErrorCode(caught) === 'flow_cancelled') {
          return;
        }
        Logger.error(caught as Error, {
          tags: { feature: KALSHI_KYC_VENDOR.loggerFeature },
        });
        setError(errorMessage(caught));
      } finally {
        setBusy(false);
      }
    },
    [refreshServerStep],
  );

  // Terms catalog.
  useEffect(() => {
    if (step !== 'terms' || terms) {
      return;
    }
    run(async () => {
      const country = await getGeoCountry();
      setTerms(
        await KycController.fetchVendorDisclaimers({ vendor: VENDOR, country }),
      );
    });
  }, [KycController, run, step, terms]);

  // While a decision is pending, keep asking kyc-api for the step.
  useEffect(() => {
    if (step !== 'waiting') {
      return undefined;
    }
    const timer = setInterval(refreshServerStep, 5000);
    return () => clearInterval(timer);
  }, [refreshServerStep, step]);

  // Keep the decision fresh while waiting, and read the Kalshi account
  // once the identity is approved.
  useEffect(() => {
    if (step === 'waiting') {
      KycController.startSessionStatusPolling({ vendor: VENDOR });
    }
    if (step === 'link' || step === 'link_waiting') {
      run(() => KycController.refreshVendorAccount({ vendor: VENDOR }));
    }
    // Only on step changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const acceptTerms = () =>
    run(async () => {
      const country = await getGeoCountry();
      KycController.acceptVendorDisclaimers({
        vendor: VENDOR,
        country,
        disclaimerIds: (terms ?? []).map(({ id }) => id),
      });
      // kyc-api keeps the acceptance before a session exists and answers with
      // the next step.
      await KycController.recordVendorDisclaimers({ vendor: VENDOR });
    });

  // Kalshi's account comes first: the phone signs Kalshi's intent and link,
  // kyc-api passes them on, and Kalshi emails a code.
  const submitEmail = () =>
    run(() =>
      KycController.startVendorAccountLink({
        vendor: VENDOR,
        email: input.trim(),
      }),
    );

  // Then MetaMask confirms the email and kyc-api opens the UKYC session for
  // the Kalshi user it recorded.
  const confirmWithMetaMask = () =>
    run(async () => {
      const email = entry?.vendorAccount?.email;
      if (!email) {
        throw new Error('Enter your email again to link Kalshi.');
      }
      const result = await verifyOrEnroll({
        methods: ['email_otp'],
        verifyWith: 'email_otp',
        reason: { operation: 'ukyc.kalshi.verifyEmail', presentation: 'card' },
      });
      const aal2Token = result.token?.accessToken;
      if (!aal2Token) {
        throw new Error('MetaMask could not confirm your email.');
      }
      await KycController.startSession({ vendor: VENDOR, aal2Token, email });
    });

  const submitEmailCode = () =>
    run(() =>
      KycController.verifyVendorEmailOtp({ vendor: VENDOR, otp: input.trim() }),
    );

  const resendEmailCode = () =>
    run(() => KycController.resendVendorEmailOtp({ vendor: VENDOR }));

  const submitPhone = () =>
    run(async () => {
      await KycController.sendVendorPhoneOtp({
        vendor: VENDOR,
        phoneNumber: input.trim(),
      });
      setPhoneCodeSent(true);
    });

  const submitPhoneCode = () =>
    run(() =>
      KycController.verifyVendorPhoneOtp({ vendor: VENDOR, otp: input.trim() }),
    );

  const launchSumSub = () =>
    run(async () => {
      const country = await getGeoCountry();
      const catalog = await KycController.fetchSessionDisclaimers({ country });
      await KycController.recordSessionDisclaimers({
        vendor: VENDOR,
        providerDisclaimersAccepted: toKeys(catalog.kycProvider),
        idosDisclaimersAccepted: toKeys(catalog.idOS),
        credentialReusabilityConsentGiven: false,
      });
      const outcome = await KycController.launchProviderFlow({
        vendor: VENDOR,
        locale: toSumSubLocale(I18n.locale),
      });
      if (outcome === 'failed') {
        throw new Error('SumSub could not finish.');
      }
      if (outcome === 'submitted') {
        KycController.startSessionStatusPolling({ vendor: VENDOR });
      }
    });

  const startLink = () =>
    run(() => KycController.startVendorAccountLink({ vendor: VENDOR }));

  const submitLinkCode = () =>
    run(() =>
      KycController.verifyVendorAccountLink({
        vendor: VENDOR,
        code: input.trim(),
      }),
    );

  const activate = () =>
    run(() =>
      KycController.activateVendorAccount({
        vendor: VENDOR,
        walletAddress: KALSHI_KYC_VENDOR.demoPayoutWallet,
        network: KALSHI_KYC_VENDOR.demoPayoutNetwork,
      }),
    );

  const refresh = () =>
    run(async () => {
      await KycController.fetchSessionStatusOnce({ vendor: VENDOR });
      if (entry?.sessionStatus?.finalStatus === 'approved') {
        await KycController.refreshVendorAccount({ vendor: VENDOR });
      }
    });

  const mfa = entry?.vendorAccount?.mfa;
  const linkCodeHint = mfa
    ? mfa.method === 'sms'
      ? `Kalshi texted a code to the phone ending ${mfa.phoneLast4 ?? '••••'}.`
      : mfa.method === 'email'
        ? `Kalshi emailed a code to ${mfa.obfuscatedEmail ?? 'your account email'}.`
        : 'Enter the code from your authenticator app.'
    : undefined;

  const field = useMemo(() => {
    switch (step) {
      case 'email':
        return { placeholder: 'you@example.com', keyboard: 'email-address' };
      case 'phone':
        return { placeholder: '+18888888888', keyboard: 'phone-pad' };
      case 'email_code':
      case 'phone_code':
      case 'link_code':
        return { placeholder: '888888', keyboard: 'number-pad' };
      default:
        return undefined;
    }
  }, [step]);

  const primary: { label: string; onPress: () => void } | undefined = (() => {
    switch (step) {
      case 'terms':
        return terms
          ? { label: 'Accept and continue', onPress: acceptTerms }
          : undefined;
      case 'email':
        return { label: 'Continue', onPress: submitEmail };
      case 'confirm':
        return { label: 'Confirm with MetaMask', onPress: confirmWithMetaMask };
      case 'email_code':
        return { label: 'Verify email', onPress: submitEmailCode };
      case 'phone':
        return { label: 'Send code', onPress: submitPhone };
      case 'phone_code':
        return { label: 'Verify phone', onPress: submitPhoneCode };
      case 'sumsub':
        return { label: 'Start verification', onPress: launchSumSub };
      case 'waiting':
      case 'link_waiting':
        return { label: 'Check again', onPress: refresh };
      case 'link':
        return { label: 'Link account', onPress: startLink };
      case 'link_code':
        return { label: 'Confirm', onPress: submitLinkCode };
      case 'activate':
        return { label: 'Activate', onPress: activate };
      default:
        return { label: 'Close', onPress: () => navigation.goBack() };
    }
  })();

  const secondary: { label: string; onPress: () => void } | undefined =
    step === 'email_code'
      ? { label: 'Send a new code', onPress: resendEmailCode }
      : step === 'phone_code'
        ? {
            label: 'Use another number',
            onPress: () => setPhoneCodeSent(false),
          }
        : step === 'link_code'
          ? { label: 'Send a new code', onPress: startLink }
          : undefined;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={KalshiOnboardingTestIds.CONTAINER}
    >
      <Box paddingHorizontal={4} twClassName="flex-row justify-between py-2">
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Sm}
          onPress={() => navigation.goBack()}
        >
          Back
        </Button>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {step}
        </Text>
      </Box>
      <ScrollView contentContainerStyle={tw.style('px-4 pb-4')}>
        <Text variant={TextVariant.HeadingLg} twClassName="mt-2">
          {copy.title}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {linkCodeHint && step === 'link_code' ? linkCodeHint : copy.body}
        </Text>

        {step === 'terms' &&
          terms?.map((disclaimer) => (
            <Button
              key={disclaimer.id}
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Sm}
              twClassName="mt-3 self-start"
              onPress={() => Linking.openURL(disclaimer.url)}
            >
              {disclaimer.display_name}
            </Button>
          ))}

        {(step === 'activate' || step === 'done') && (
          <Text variant={TextVariant.BodySm} twClassName="mt-4">
            Payout wallet ({KALSHI_KYC_VENDOR.demoPayoutNetwork}, demo):{' '}
            {entry?.vendorAccount?.walletAddress ??
              KALSHI_KYC_VENDOR.demoPayoutWallet}
          </Text>
        )}

        {field && (
          <Box twClassName="mt-6">
            <TextField
              testID={KalshiOnboardingTestIds.INPUT}
              value={input}
              onChangeText={setInput}
              placeholder={field.placeholder}
              inputProps={{
                autoCapitalize: 'none',
                autoCorrect: false,
                keyboardType: field.keyboard as 'default',
              }}
            />
          </Box>
        )}

        {error && (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            twClassName="mt-4"
            testID={KalshiOnboardingTestIds.ERROR}
          >
            {error}
          </Text>
        )}
      </ScrollView>
      <Box twClassName="p-4 gap-2">
        {primary && (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isLoading={busy}
            isDisabled={
              busy || (field !== undefined && input.trim().length === 0)
            }
            onPress={primary.onPress}
            testID={KalshiOnboardingTestIds.PRIMARY}
          >
            {primary.label}
          </Button>
        )}
        {secondary && (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={busy}
            onPress={secondary.onPress}
          >
            {secondary.label}
          </Button>
        )}
      </Box>
    </SafeAreaView>
  );
};

export default KalshiOnboarding;
