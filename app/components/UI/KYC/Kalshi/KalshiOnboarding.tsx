import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type {
  KycAccountLinkMfaMethod,
  KycCatalogDocument,
  KycConsentDocument,
  KycDisclaimer,
  KycStep,
  OnboardingVendorState,
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
import { deriveKalshiScreen, type KalshiScreen } from './kalshiScreen';
import { nextWaitingPollDelayMs } from './waitingPoll';

const VENDOR = KALSHI_KYC_VENDOR.id;

export const KalshiOnboardingTestIds = {
  CONTAINER: 'kalshi-onboarding',
  INPUT: 'kalshi-onboarding-input',
  PRIMARY: 'kalshi-onboarding-primary',
  SECONDARY: 'kalshi-onboarding-secondary',
  ERROR: 'kalshi-onboarding-error',
} as const;

const selectKalshiFlow = (
  state: RootState,
): OnboardingVendorState | undefined =>
  state.engine.backgroundState.VendorOnboardingController?.vendors?.[VENDOR];

const toKeys = (
  documents: (KycCatalogDocument | KycConsentDocument)[] | undefined,
) => (documents ?? []).map(({ key, version }) => ({ key, version }));

const getKycService = () => {
  const { KycService } = Engine.context;
  if (!KycService) {
    throw new Error('KYC service is unavailable');
  }
  return KycService;
};

const getGeoCountry = (): Promise<string> => getKycService().getGeoCountry();

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

const SCREEN_COPY: Record<
  Exclude<KalshiScreen, 'loading'>,
  { title: string; body: string }
> = {
  terms: {
    title: 'Kalshi terms',
    body: 'Review and accept Kalshi’s terms to open a Kalshi account.',
  },
  email: {
    title: 'Your email',
    body: 'Kalshi creates your account with this email and sends you a code.',
  },
  link_code: {
    title: 'Confirm the link',
    body: `Enter the code Kalshi emailed you. Demo: ${KALSHI_KYC_VENDOR.demoValues.code}.`,
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
    body: `Kalshi texts a code to this number. Demo: ${KALSHI_KYC_VENDOR.demoValues.phone}.`,
  },
  phone_code: {
    title: 'Check your phone',
    body: `Enter the code Kalshi texted you. Demo: ${KALSHI_KYC_VENDOR.demoValues.code}.`,
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
  done: {
    title: 'Identity verified',
    body: 'Kalshi has your verified identity. Predict activates your account when you start trading.',
  },
  error: {
    title: 'Can’t finish setup',
    body: 'Something went wrong with this step. Try again in a moment.',
  },
};

const mfaHint = (method: KycAccountLinkMfaMethod): string => {
  switch (method) {
    case 'sms':
      return 'Kalshi texted you a second code. Enter it here.';
    case 'email':
      return 'Kalshi emailed you a second code. Enter it here.';
    default:
      return 'Enter the code from your authenticator app.';
  }
};

const FIELDS: Partial<
  Record<KalshiScreen, { placeholder: string; keyboard: string }>
> = {
  email: { placeholder: 'you@example.com', keyboard: 'email-address' },
  phone: { placeholder: '+18888888888', keyboard: 'phone-pad' },
  email_code: { placeholder: '888888', keyboard: 'number-pad' },
  phone_code: { placeholder: '888888', keyboard: 'number-pad' },
  link_code: { placeholder: '888888', keyboard: 'number-pad' },
};

/**
 * Kalshi onboarding through `VendorOnboardingController`. One screen that shows
 * whatever step kyc-api says the user is on, so it resumes wherever they left
 * off, on any device. The phone keeps nothing that kyc-api can work out: the
 * email, the phone code state and the MFA hint only live while this screen is
 * open.
 */
const KalshiOnboarding = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { verifyOrEnroll } = useMfa();
  const flowState = useSelector(selectKalshiFlow);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [linkedEmail, setLinkedEmail] = useState<string>();
  const [mfaMethod, setMfaMethod] = useState<KycAccountLinkMfaMethod>();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [terms, setTerms] = useState<KycDisclaimer[]>();
  const step = flowState?.step;
  // idOS's own step, from kyc-api's answer, says which code it is waiting for.
  const relayStep = flowState?.relayStep ?? undefined;
  const screen = deriveKalshiScreen(step, { relayStep, phoneCodeSent });
  const { VendorOnboardingController } = Engine.context;

  // Each screen starts with an empty field.
  useEffect(() => {
    setInput('');
  }, [screen]);

  // Ask kyc-api for the step. For opening the screen and for polling.
  const refresh = useCallback(async () => {
    try {
      await VendorOnboardingController.refreshStep({ vendor: VENDOR });
    } catch (caught) {
      Logger.error(caught as Error, {
        tags: { feature: KALSHI_KYC_VENDOR.loggerFeature },
      });
    }
  }, [VendorOnboardingController]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Every controller action saves the step it ended on, so there is nothing
  // to read after one.
  const run = useCallback(async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
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
  }, []);

  // Terms catalog.
  useEffect(() => {
    if (screen !== 'terms' || terms) {
      return;
    }
    run(async () => {
      const country = await getGeoCountry();
      setTerms(
        await getKycService().fetchVendorDisclaimers({
          vendor: VENDOR,
          country,
        }),
      );
    });
  }, [run, screen, terms]);

  // While the decision is pending, keep asking kyc-api for the step. The pace
  // slows down because every read makes kyc-api read the idOS relay.
  useEffect(() => {
    if (screen !== 'waiting') {
      return undefined;
    }
    let reads = 0;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      timer = setTimeout(async () => {
        await refresh();
        reads += 1;
        if (!stopped) {
          schedule();
        }
      }, nextWaitingPollDelayMs(reads));
    };
    schedule();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [refresh, screen]);

  const acceptTerms = () =>
    run(async () => {
      const country = await getGeoCountry();
      await VendorOnboardingController.acceptTerms({
        vendor: VENDOR,
        country,
        disclaimerIds: (terms ?? []).map(({ id }) => id),
      });
    });

  // Kalshi's account comes first: the phone signs Kalshi's intent and link,
  // kyc-api passes them on, and Kalshi emails a code.
  const submitEmail = () =>
    run(async () => {
      const email = input.trim();
      await VendorOnboardingController.startAccountLink({
        vendor: VENDOR,
        email,
      });
      setLinkedEmail(email);
    });

  const submitLinkCode = () =>
    run(async () => {
      const result = await VendorOnboardingController.verifyAccountLink({
        vendor: VENDOR,
        code: input.trim(),
      });
      setMfaMethod(result.mfaMethod);
      setInput('');
    });

  // Then MetaMask confirms the email and kyc-api opens the UKYC session for
  // the Kalshi user it recorded.
  const confirmWithMetaMask = () =>
    run(async () => {
      const result = await verifyOrEnroll({
        methods: ['email_otp'],
        verifyWith: 'email_otp',
        reason: { operation: 'ukyc.kalshi.verifyEmail', presentation: 'card' },
      });
      const aal2Token = result.token?.accessToken;
      if (!aal2Token) {
        throw new Error('MetaMask could not confirm your email.');
      }
      await VendorOnboardingController.startSession({
        vendor: VENDOR,
        aal2Token,
        ...(linkedEmail ? { email: linkedEmail } : {}),
      });
    });

  const submitEmailCode = () =>
    run(() =>
      VendorOnboardingController.submitEmailCode({
        vendor: VENDOR,
        code: input.trim(),
      }),
    );

  const resendEmailCode = () =>
    run(() => VendorOnboardingController.resendEmailCode({ vendor: VENDOR }));

  const submitPhone = () =>
    run(async () => {
      await VendorOnboardingController.submitPhone({
        vendor: VENDOR,
        phoneNumber: input.trim(),
      });
      setPhoneCodeSent(true);
    });

  const submitPhoneCode = () =>
    run(() =>
      VendorOnboardingController.submitPhoneCode({
        vendor: VENDOR,
        code: input.trim(),
      }),
    );

  const launchSumSub = () =>
    run(async () => {
      const catalog = await VendorOnboardingController.fetchSessionDisclaimers({
        vendor: VENDOR,
      });
      const documents = [...catalog.idOS, ...catalog.kycProvider];
      if (!documents.every(({ consented }) => consented)) {
        await VendorOnboardingController.acceptSessionDisclaimers({
          vendor: VENDOR,
          idOS: toKeys(catalog.idOS),
          kycProvider: toKeys(catalog.kycProvider),
          // Demo choice. Whether the user is asked is a product decision.
          credentialReusabilityConsentGiven: false,
        });
      }
      const outcome = await VendorOnboardingController.launchProviderFlow({
        vendor: VENDOR,
        locale: toSumSubLocale(I18n.locale),
      });
      if (outcome === 'failed') {
        throw new Error('SumSub could not finish.');
      }
    });

  const checkAgain = () =>
    run(() => VendorOnboardingController.refreshStep({ vendor: VENDOR }));

  const field = FIELDS[screen];

  const primary: { label: string; onPress: () => void } | undefined =
    useMemo(() => {
      switch (screen) {
        case 'loading':
          return undefined;
        case 'terms':
          return terms
            ? { label: 'Accept and continue', onPress: acceptTerms }
            : undefined;
        case 'email':
          return { label: 'Continue', onPress: submitEmail };
        case 'link_code':
          return { label: 'Confirm', onPress: submitLinkCode };
        case 'confirm':
          return {
            label: 'Confirm with MetaMask',
            onPress: confirmWithMetaMask,
          };
        case 'email_code':
          return { label: 'Verify email', onPress: submitEmailCode };
        case 'phone':
          return { label: 'Send code', onPress: submitPhone };
        case 'phone_code':
          return { label: 'Verify phone', onPress: submitPhoneCode };
        case 'sumsub':
          return { label: 'Start verification', onPress: launchSumSub };
        case 'waiting':
        case 'error':
          return { label: 'Check again', onPress: checkAgain };
        default:
          return { label: 'Close', onPress: () => navigation.goBack() };
      }
      // The handlers close over the current input and terms.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screen, terms, input, linkedEmail, navigation]);

  const secondary: { label: string; onPress: () => void } | undefined =
    screen === 'email_code'
      ? { label: 'Send a new code', onPress: resendEmailCode }
      : screen === 'phone_code'
        ? {
            label: 'Use another number',
            onPress: () => setPhoneCodeSent(false),
          }
        : undefined;

  const copy = screen === 'loading' ? undefined : SCREEN_COPY[screen];

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
          {step ?? '…'}
        </Text>
      </Box>
      <ScrollView contentContainerStyle={tw.style('px-4 pb-4')}>
        {copy && (
          <>
            <Text variant={TextVariant.HeadingLg} twClassName="mt-2">
              {copy.title}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="mt-2"
            >
              {screen === 'link_code' && mfaMethod
                ? mfaHint(mfaMethod)
                : copy.body}
            </Text>
          </>
        )}

        {screen === 'terms' &&
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
            testID={KalshiOnboardingTestIds.SECONDARY}
          >
            {secondary.label}
          </Button>
        )}
      </Box>
    </SafeAreaView>
  );
};

export default KalshiOnboarding;
