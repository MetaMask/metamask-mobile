import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type {
  KycCatalogDocument,
  KycConsentDocument,
  KycDisclaimer,
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
import { runKalshiSignedAction } from './kalshiVendorRequestSigner';
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
    body: 'Kalshi creates your account with this email and sends you a code. It can differ from your MetaMask email.',
  },
  confirm: {
    title: 'Confirm with MetaMask',
    body: 'MetaMask confirms it’s you. Next you’ll choose the email Kalshi uses.',
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

const FIELDS: Partial<
  Record<KalshiScreen, { placeholder: string; keyboard: string }>
> = {
  email: { placeholder: 'you@example.com', keyboard: 'email-address' },
  phone: { placeholder: '+18888888888', keyboard: 'phone-pad' },
  email_code: { placeholder: '888888', keyboard: 'number-pad' },
  phone_code: { placeholder: '888888', keyboard: 'number-pad' },
};

/**
 * Kalshi onboarding through `VendorOnboardingController`. One screen that shows
 * whatever step kyc-api says the user is on, so it resumes wherever they left
 * off, on any device. The phone keeps the MFA token, the typed Kalshi email
 * and the phone-code field only while this screen is open.
 */
const KalshiOnboarding = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { verifyOrEnroll } = useMfa();
  const flowState = useSelector(selectKalshiFlow);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [emailEntry, setEmailEntry] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  /** Held from MetaMask MFA until the Kalshi email is submitted. */
  const [aal2Token, setAal2Token] = useState<string>();
  /** Carried into the field on the next screen change, then forgotten. */
  const prefill = useRef<string | undefined>(undefined);
  const [linkedEmail, setLinkedEmail] = useState<string>();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [terms, setTerms] = useState<KycDisclaimer[]>();
  const step = flowState?.step;
  const status = flowState?.status ?? 'none';
  const screen = deriveKalshiScreen(step, status, {
    emailEntry,
    editingEmail,
    phoneCodeSent,
  });
  const { VendorOnboardingController } = Engine.context;

  // Each screen starts with an empty field.
  // The field is per screen, so it starts empty on every change — unless
  // something deliberately carried a value over, like going back to correct
  // a mistyped email.
  useEffect(() => {
    setInput(prefill.current ?? '');
    prefill.current = undefined;
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

  // MetaMask MFA first. The token is held until the user submits the Kalshi
  // email, which is what creates the session.
  const confirmWithMetaMask = () =>
    run(async () => {
      const result = await verifyOrEnroll({
        methods: ['email_otp'],
        verifyWith: 'email_otp',
        reason: { operation: 'ukyc.kalshi.verifyEmail', presentation: 'card' },
      });
      const token = result.token?.accessToken;
      if (!token) {
        throw new Error('MetaMask could not confirm your email.');
      }
      const emailCredential = result.credentials?.find(
        (credential) => credential.type === 'email_otp',
      );
      const verified =
        emailCredential?.type === 'email_otp'
          ? emailCredential.email
          : undefined;
      prefill.current = verified ?? '';
      setAal2Token(token);
      setEmailEntry(true);
    });

  /**
   * Submits the Kalshi email.
   *
   * Before a session exists this creates one, and the phone signs the
   * enrollment intent and `users/link` into that request. On the code step
   * it signs a new `users/link` for a corrected address.
   */
  const submitEmail = () =>
    run(async () => {
      const email = input.trim();
      if (editingEmail || step === 'identity_email_code') {
        await runKalshiSignedAction(() =>
          VendorOnboardingController.resendEmailCode({
            vendor: VENDOR,
            email,
          }),
        );
        setEditingEmail(false);
      } else {
        if (!aal2Token) {
          throw new Error('MetaMask could not confirm your email.');
        }
        await runKalshiSignedAction(() =>
          VendorOnboardingController.startSession({
            vendor: VENDOR,
            aal2Token,
            email,
          }),
        );
        setEmailEntry(false);
      }
      setLinkedEmail(email);
    });

  /**
   * Goes back to the email field so a mistyped address can be corrected.
   *
   * The session already exists. Submitting signs a new `users/link` on it.
   */
  const editLinkEmail = () => {
    prefill.current = linkedEmail ?? '';
    setEditingEmail(true);
  };

  const submitEmailCode = () =>
    run(() =>
      runKalshiSignedAction(() =>
        VendorOnboardingController.submitEmailCode({
          vendor: VENDOR,
          code: input.trim(),
        }),
      ),
    );

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
    }, [screen, terms, input, linkedEmail, aal2Token, navigation]);

  const secondary: { label: string; onPress: () => void } | undefined =
    screen === 'email_code'
      ? { label: 'Use another email', onPress: editLinkEmail }
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
              {copy.body}
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
