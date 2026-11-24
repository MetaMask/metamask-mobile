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
  KycConsentRecord,
  OnboardingVendorState,
} from '@metamask/kyc-controller';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
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
import { describeKalshiError, shouldRefreshAfter } from './kalshiErrors';
import { deriveKalshiScreen, type KalshiScreen } from './kalshiScreen';
import { runKalshiSignedAction } from './kalshiVendorRequestSigner';
import { nextWaitingPollDelayMs } from './waitingPoll';
import VbaFoxLoader from '../../Ramp/Views/VirtualBankAccount/VbaFoxLoader';

const VENDOR = KALSHI_KYC_VENDOR.id;

export const KalshiOnboardingTestIds = {
  CONTAINER: 'kalshi-onboarding',
  INPUT: 'kalshi-onboarding-input',
  PRIMARY: 'kalshi-onboarding-primary',
  SECONDARY: 'kalshi-onboarding-secondary',
  ERROR: 'kalshi-onboarding-error',
  RESEND: 'kalshi-onboarding-resend',
  LOADER: 'kalshi-onboarding-loader',
} as const;

const selectKalshiFlow = (
  state: RootState,
): OnboardingVendorState | undefined =>
  state.engine.backgroundState.VendorOnboardingController?.vendors?.[VENDOR];

interface TermsDocument {
  key: string;
  title: string;
  url: string;
}

interface TermsPage {
  id: 'idos' | 'kycProvider' | 'kalshi';
  title: string;
  documents: TermsDocument[];
}

interface TermsCatalog {
  pages: TermsPage[];
  idOS: KycConsentRecord[];
  kycProvider: KycConsentRecord[];
  vendorDisclaimerIds: string[];
  country: string;
}

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
  const kalshiMessage = describeKalshiError(error);
  if (kalshiMessage) {
    return kalshiMessage;
  }
  if (error instanceof Error && error.message) {
    const { status, code } = error as Error & {
      status?: number;
      code?: string;
    };
    return [error.message, code, status].filter(Boolean).join(' · ');
  }
  return 'Something went wrong.';
};

const TERMS_PAGE_COPY: Record<
  TermsPage['id'],
  { title: string; body: string }
> = {
  idos: {
    title: 'idOS terms',
    body: 'idOS stores your verified identity and shares it only with your consent.',
  },
  kycProvider: {
    title: 'SumSub terms',
    body: 'SumSub checks your ID and selfie for idOS.',
  },
  kalshi: {
    title: 'Kalshi terms',
    body: 'Review Kalshi’s agreements to open a Kalshi account.',
  },
};

const SCREEN_COPY: Record<
  Exclude<KalshiScreen, 'loading'>,
  { title: string; body: string }
> = {
  terms: {
    title: 'Terms',
    body: 'Review and accept the terms to continue.',
  },
  email: {
    title: 'Your email',
    body: 'Kalshi creates your account with this email and sends you a code. It can differ from your MetaMask email.',
  },
  confirm: {
    title: 'Confirm with MetaMask',
    body: 'MetaMask confirms it’s you. Then you choose the email for Kalshi.',
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
 * off, on any device. The phone keeps the terms the user accepted and the
 * code fields only while this screen is open.
 */
const KalshiOnboarding = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { verifyOrEnroll } = useMfa();
  const flowState = useSelector(selectKalshiFlow);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  /**
   * The MFA token, held until the Kalshi email opens the session. Kept in a
   * ref so it never reaches state or storage.
   */
  const aal2Token = useRef<string | undefined>(undefined);
  /** Tracks the saved flag so a retry can see it even from an older render. */
  const mfaCompleted = useRef(false);
  mfaCompleted.current = flowState?.mfaCompleted === true;
  const [editingEmail, setEditingEmail] = useState(false);
  /** The email the field starts with: the MetaMask email, then the last one sent. */
  const emailDefault = useRef<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [terms, setTerms] = useState<TermsCatalog>();
  /** The terms page showing. Nothing is sent until the last one is accepted. */
  const [termsPage, setTermsPage] = useState(0);
  /**
   * Set when Confirm is pressed and cleared only once the terms page is
   * ready. The step arrives from the controller a moment after the button
   * stops waiting, and that gap was painting Confirm again.
   */
  const [awaitingTerms, setAwaitingTerms] = useState(false);
  const step = flowState?.step;
  const status = flowState?.status ?? 'none';
  const screen = deriveKalshiScreen(step, status, {
    emailSent: Boolean(flowState?.sessionId),
    editingEmail,
    phoneCodeSent,
  });
  // Hold one screen from the confirm press until the terms page is ready.
  // The saved step and the terms catalog arrive as later updates, and each
  // one was painting its own page.
  const holding =
    awaitingTerms ||
    (screen === 'confirm' && busy) ||
    (screen === 'terms' && !terms && !error);
  const { VendorOnboardingController } = Engine.context;

  // Each screen starts with an empty field, except the email, which starts
  // with the MetaMask email and can be changed.
  useEffect(() => {
    setInput(screen === 'email' ? (emailDefault.current ?? '') : '');
  }, [screen]);

  // The relay opens the Kalshi account with the verified MetaMask email, so
  // that is what the field starts with. The screen can mount long after MFA
  // ran, so it asks for the email instead of remembering it from MFA.
  useEffect(() => {
    if (screen !== 'email' || emailDefault.current) {
      return undefined;
    }
    let cancelled = false;
    VendorOnboardingController.getPartnerEmail({ vendor: VENDOR })
      .then((email) => {
        if (cancelled || !email || emailDefault.current) {
          return;
        }
        emailDefault.current = email;
        setInput((typed) => typed || email);
      })
      .catch((caught) => {
        Logger.error(caught as Error, {
          tags: { feature: KALSHI_KYC_VENDOR.loggerFeature },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [screen, VendorOnboardingController]);

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

  useEffect(() => {
    if (!awaitingTerms) {
      return;
    }
    if (error || (screen === 'terms' && terms)) {
      setAwaitingTerms(false);
    }
  }, [awaitingTerms, error, screen, terms]);

  // Every controller action saves the step it ended on, so there is nothing
  // to read after one.
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
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
        if (shouldRefreshAfter(caught)) {
          await refresh();
          return;
        }
        setError(errorMessage(caught));
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  // Terms catalog: idOS and SumSub documents for the country, and Kalshi's.
  // The country catalog needs no session, so the terms come before one exists.
  useEffect(() => {
    if (screen !== 'terms' || terms) {
      return;
    }
    run(async () => {
      const country = await getGeoCountry();
      const [session, vendorDocuments] = await Promise.all([
        getKycService().fetchSessionDisclaimersByCountry({ country }),
        getKycService().fetchVendorDisclaimers({ vendor: VENDOR, country }),
      ]);
      const fromCatalog = (
        documents: (KycCatalogDocument | KycConsentDocument)[],
      ): TermsDocument[] =>
        documents.map(({ key, title, url }) => ({ key, title, url }));
      const pages: TermsPage[] = [
        {
          id: 'idos' as const,
          title: TERMS_PAGE_COPY.idos.title,
          documents: fromCatalog(session.idOS),
        },
        {
          id: 'kycProvider' as const,
          title: TERMS_PAGE_COPY.kycProvider.title,
          documents: fromCatalog(session.kycProvider),
        },
        {
          id: 'kalshi' as const,
          title: TERMS_PAGE_COPY.kalshi.title,
          documents: vendorDocuments.map(({ id, display_name, url }) => ({
            key: id,
            title: display_name,
            url,
          })),
        },
      ].filter(({ documents }) => documents.length > 0);
      setTermsPage(0);
      setTerms({
        pages,
        idOS: toKeys(session.idOS),
        kycProvider: toKeys(session.kycProvider),
        vendorDisclaimerIds: vendorDocuments.map(({ id }) => id),
        country,
      });
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

  // The user accepts one page at a time on the phone. Nothing is sent until
  // the last page, then everything goes in one call.
  const acceptTermsPage = () => {
    if (!terms) {
      return undefined;
    }
    if (termsPage < terms.pages.length - 1) {
      setTermsPage(termsPage + 1);
      return undefined;
    }
    return run(() =>
      VendorOnboardingController.submitTerms({
        vendor: VENDOR,
        country: terms.country,
        disclaimerIds: terms.vendorDisclaimerIds,
        idOS: toKeys(terms.idOS),
        kycProvider: toKeys(terms.kycProvider),
        // Demo choice. Whether the user is asked is a product decision.
        credentialReusabilityConsentGiven: false,
      }),
    );
  };

  /**
   * MetaMask MFA, which comes before any session. The token stays in memory
   * until the Kalshi email opens the session, and the phone tells kyc-api MFA
   * is done so the next step is the terms.
   *
   * A second tap skips MFA. The token is already held, and opening the
   * MetaMask prompt again is what fails after a confirm that did not move
   * the step.
   */
  const confirmWithMetaMask = () => {
    setAwaitingTerms(true);
    return run(async () => {
      try {
        if (!aal2Token.current && !mfaCompleted.current) {
          const result = await verifyOrEnroll({
            methods: ['email_otp'],
            verifyWith: 'email_otp',
            reason: {
              operation: 'ukyc.kalshi.verifyEmail',
              presentation: 'card',
            },
          });
          const token = result.token?.accessToken;
          if (!token) {
            throw new Error('MetaMask couldn’t confirm your email.');
          }
          const emailCredential = result.credentials?.find(
            (credential) => credential.type === 'email_otp',
          );
          if (emailCredential?.type === 'email_otp' && !emailDefault.current) {
            emailDefault.current = emailCredential.email;
          }
          aal2Token.current = token;
        }
        const next = await VendorOnboardingController.recordMfaCompleted({
          vendor: VENDOR,
        });
        if (next === 'mfa') {
          throw new Error(
            'MetaMask confirmed you, but setup didn’t move on. Try again.',
          );
        }
        if (next !== 'terms') {
          setAwaitingTerms(false);
        }
      } catch (caught) {
        setAwaitingTerms(false);
        throw caught;
      }
    });
  };

  /**
   * Runs MFA again when the token from the confirm step is gone, which
   * happens when the screen was left and opened again.
   */
  const ensureAal2Token = async (): Promise<string> => {
    const held = aal2Token.current;
    if (held) {
      return held;
    }
    const result = await verifyOrEnroll({
      methods: ['email_otp'],
      verifyWith: 'email_otp',
      reason: { operation: 'ukyc.kalshi.verifyEmail', presentation: 'card' },
    });
    const token = result.token?.accessToken;
    if (!token) {
      throw new Error('MetaMask couldn’t confirm your email.');
    }
    aal2Token.current = token;
    return token;
  };

  /**
   * Signs `users/link` for the address typed here. Before a session exists
   * this opens it, with the enrollment intent, and the address has to be the
   * verified MetaMask email: the relay rejects any other. On the code step it
   * sends a new code on the same session.
   */
  const sendEmailCode = (email: string) =>
    run(async () => {
      if (flowState?.sessionId) {
        await runKalshiSignedAction(() =>
          VendorOnboardingController.sendEmailOtp({ vendor: VENDOR, email }),
        );
      } else {
        const token = await ensureAal2Token();
        await runKalshiSignedAction(() =>
          VendorOnboardingController.startSession({
            vendor: VENDOR,
            aal2Token: token,
            email,
          }),
        );
        aal2Token.current = undefined;
      }
      setEditingEmail(false);
      emailDefault.current = email;
    });

  const submitEmail = () => sendEmailCode(input.trim());

  /** Goes back to the email field so a mistyped address can be corrected. */
  const editEmail = () => {
    setEditingEmail(true);
  };

  /**
   * Sends the code again to the address last sent. After a reinstall the
   * phone no longer knows it, so the user types it again.
   */
  const resendEmailCode = () =>
    emailDefault.current ? sendEmailCode(emailDefault.current) : editEmail();

  const submitEmailCode = () =>
    run(() =>
      runKalshiSignedAction(() =>
        VendorOnboardingController.verifyEmailOtp({
          vendor: VENDOR,
          code: input.trim(),
        }),
      ),
    );

  const submitPhone = () =>
    run(async () => {
      await VendorOnboardingController.sendPhoneOtp({
        vendor: VENDOR,
        phoneNumber: input.trim(),
      });
      setPhoneCodeSent(true);
    });

  const submitPhoneCode = () =>
    run(() =>
      VendorOnboardingController.verifyPhoneOtp({
        vendor: VENDOR,
        code: input.trim(),
      }),
    );

  const launchSumSub = () =>
    run(async () => {
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
            ? {
                label:
                  termsPage < terms.pages.length - 1
                    ? 'Accept and continue'
                    : 'Accept and submit',
                onPress: acceptTermsPage,
              }
            : undefined;
        case 'email':
          return { label: 'Continue', onPress: submitEmail };
        case 'confirm':
          return {
            label: flowState?.mfaCompleted
              ? 'Continue'
              : 'Confirm with MetaMask',
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
    }, [screen, terms, termsPage, input, navigation, flowState?.mfaCompleted]);

  const secondary: { label: string; onPress: () => void } | undefined =
    screen === 'terms' && termsPage > 0
      ? { label: 'Back', onPress: () => setTermsPage(termsPage - 1) }
      : screen === 'email_code'
        ? { label: 'Use another email', onPress: editEmail }
        : screen === 'phone_code'
          ? {
              label: 'Use another number',
              onPress: () => setPhoneCodeSent(false),
            }
          : undefined;

  const currentTermsPage = terms?.pages[termsPage];
  const copy = holding
    ? undefined
    : screen === 'loading'
      ? undefined
      : screen === 'confirm' && flowState?.mfaCompleted
        ? {
            title: 'Confirm with MetaMask',
            body: 'MetaMask confirmed you. Continue to the terms.',
          }
        : screen === 'terms' && currentTermsPage
          ? TERMS_PAGE_COPY[currentTermsPage.id]
          : SCREEN_COPY[screen];

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
          {holding ? '…' : (step ?? '…')}
        </Text>
      </Box>
      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style(
          'px-4 pb-4',
          holding && 'flex-grow justify-center',
        )}
      >
        {holding ? (
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
          >
            <VbaFoxLoader testID={KalshiOnboardingTestIds.LOADER} />
          </Box>
        ) : (
          copy && (
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
          )
        )}

        {!holding &&
          screen === 'terms' &&
          currentTermsPage?.documents.map((document) => (
            <Button
              key={document.key}
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Sm}
              twClassName="mt-3 self-start"
              onPress={() => Linking.openURL(document.url)}
            >
              {document.title}
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
        {primary && !holding && (
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
        {screen === 'email_code' && (
          <Button
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={busy}
            onPress={resendEmailCode}
            testID={KalshiOnboardingTestIds.RESEND}
          >
            Send a new code
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
