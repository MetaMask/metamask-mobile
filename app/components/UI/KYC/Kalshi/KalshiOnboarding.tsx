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
import type { OnboardingVendorState } from '@metamask/kyc-controller';
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
import I18n, { strings } from '../../../../../locales/i18n';
import type { RootState } from '../../../../reducers';
import { useMfa } from '../../../../util/identity/mfa';
import { resolveGeoCountry } from '../utils/resolveGeoCountry';
import { toSumSubLocale } from '../utils/toSumSubLocale';
import { KALSHI_KYC_VENDOR } from '../vendors/kalshi';
import { describeKalshiError, shouldRefreshAfter } from './kalshiErrors';
import { deriveKalshiScreen, type KalshiScreen } from './kalshiScreen';
import { runKalshiSignedAction } from './kalshiVendorRequestSigner';
import { nextWaitingPollDelayMs } from './waitingPoll';
import VbaFoxLoader from '../../Ramp/Views/VirtualBankAccount/VbaFoxLoader';
import KycVerifyIdentity from '../Views/SumSub/VerifyIdentity';
import KycPartnerTerms from '../Views/SumSub/PartnerTerms';
import type { KycCatalogDisclaimerLink } from '../hooks/useKycSessionDisclaimers';
import { groupDisclaimers } from '../Views/SumSub/partnerDisclaimers';
const VENDOR = KALSHI_KYC_VENDOR.id;

/**
 * TODO: as it has been done with Iron inside app/components/UI/KYC/utils/identityTermsAnalytics.ts,
 * we also need a handler for the Predict terms tracking.
 */
const reportKalshiMetaMaskTerms = () => undefined;

/**
 * Kalshi consent is three pages: MetaMask, the verification partners, then
 * Kalshi. VBA stops after the first two.
 */
const KALSHI_CONSENT_TOTAL_STEPS = 3;

const KALSHI_TERMS_PAGE = {
  metamask: 0,
  partners: 1,
  kalshi: 2,
} as const;

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

interface KalshiVendorTerms {
  documents: TermsDocument[];
  vendorDisclaimerIds: string[];
}

const getKycService = () => {
  const { KycService } = Engine.context;
  if (!KycService) {
    throw new Error('KYC service is unavailable');
  }
  return KycService;
};

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

const KALSHI_TERMS_COPY = {
  title: 'Kalshi terms',
  body: 'Review Kalshi’s agreements to open a Kalshi account.',
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
  const [emailSent, setEmailSent] = useState(false);
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
  const [terms, setTerms] = useState<KalshiVendorTerms>();
  /**
   * Which of the three consent pages is showing. Nothing is sent until the
   * Kalshi page, the last one.
   */
  const [termsPage, setTermsPage] = useState<number>(
    KALSHI_TERMS_PAGE.metamask,
  );
  /** idOS and SumSub documents from the MetaMask page, shown on page two. */
  const [partnerDisclaimers, setPartnerDisclaimers] =
    useState<KycCatalogDisclaimerLink[]>();
  /**
   * Set when Confirm is pressed and cleared only once the terms page is
   * ready. The step arrives from the controller a moment after the button
   * stops waiting, and that gap was painting Confirm again.
   */
  const [awaitingTerms, setAwaitingTerms] = useState(false);
  const step = flowState?.step;
  const status = flowState?.status ?? 'none';
  const screen = deriveKalshiScreen(step, status, {
    emailSent,
    editingEmail,
    phoneCodeSent,
  });
  // Hold one screen from the confirm press until the step is terms.
  // The MetaMask page loads its own catalog, so the document list can
  // arrive after it is already on screen.
  const holding =
    awaitingTerms ||
    (screen === 'confirm' && busy) ||
    (screen === 'terms' &&
      termsPage === KALSHI_TERMS_PAGE.kalshi &&
      !terms &&
      !error);
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
    if (error || screen === 'terms') {
      setAwaitingTerms(false);
    }
  }, [awaitingTerms, error, screen]);

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

  // Kalshi's own agreements. idOS and SumSub come from the shared pages.
  // The country catalog needs no session, so this can load before one exists.
  useEffect(() => {
    if (screen !== 'terms' || terms) {
      return;
    }
    run(async () => {
      // Same country as the shared pages, since one submitTerms sends both.
      const country = await resolveGeoCountry();
      const vendorDocuments = await getKycService().fetchVendorDisclaimers({
        vendor: VENDOR,
        country,
      });
      setTerms({
        documents: vendorDocuments.map(
          ({ id, display_name: displayName, url }) => ({
            key: id,
            title: displayName,
            url,
          }),
        ),
        vendorDisclaimerIds: vendorDocuments.map(({ id }) => id),
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

  // The first two pages only advance. Everything is sent from the last page.
  const acceptKalshiTerms = () => {
    if (!terms || !partnerDisclaimers) {
      return undefined;
    }
    const { idos, kycProvider } = groupDisclaimers(partnerDisclaimers);
    return run(() =>
      VendorOnboardingController.submitTerms({
        vendor: VENDOR,
        disclaimerIds: terms.vendorDisclaimerIds,
        idOS: idos.map(({ key, version }) => ({ key, version })),
        kycProvider: kycProvider.map(({ key, version }) => ({ key, version })),
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
  const recordMfa = async () => {
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
    return VendorOnboardingController.recordMfaCompleted({ vendor: VENDOR });
  };

  /**
   * When kyc-api still asks for MFA after it was recorded, a session is
   * already open and its capability authorization expired or was wiped.
   * Resuming the session submits fresh authorizations.
   */
  const confirmWithMetaMask = () => {
    setAwaitingTerms(true);
    return run(async () => {
      try {
        let next = await recordMfa();
        if (next === 'mfa') {
          next = await VendorOnboardingController.startSession({
            vendor: VENDOR,
          });
        }
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
   * sends a new code on the same session. After the screen was opened again
   * the phone cannot tell whether a session exists, so `startSession` resumes
   * the one the step carries or opens a new one.
   */
  const sendEmailCode = (email: string) =>
    run(async () => {
      if (emailSent) {
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
      setEmailSent(true);
      setEditingEmail(false);
      emailDefault.current = email;
    });

  const submitEmail = () => sendEmailCode(input.trim());

  /** Goes back to the email field so a mistyped address can be corrected. */
  const editEmail = () => {
    setEditingEmail(true);
  };

  /** Sends the code again to the address last sent. */
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
          return terms && partnerDisclaimers
            ? { label: 'Accept and submit', onPress: acceptKalshiTerms }
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
    }, [
      screen,
      terms,
      partnerDisclaimers,
      input,
      navigation,
      flowState?.mfaCompleted,
      emailSent,
    ]);

  const secondary: { label: string; onPress: () => void } | undefined =
    screen === 'terms' && termsPage === KALSHI_TERMS_PAGE.kalshi
      ? {
          label: 'Back',
          onPress: () => setTermsPage(KALSHI_TERMS_PAGE.partners),
        }
      : screen === 'email_code'
        ? { label: 'Use another email', onPress: editEmail }
        : screen === 'phone_code'
          ? {
              label: 'Use another number',
              onPress: () => setPhoneCodeSent(false),
            }
          : undefined;

  const copy = holding
    ? undefined
    : screen === 'loading'
      ? undefined
      : screen === 'confirm' && flowState?.mfaCompleted
        ? {
            title: 'Confirm with MetaMask',
            body: 'MetaMask confirmed you. Continue to the terms.',
          }
        : screen === 'terms'
          ? KALSHI_TERMS_COPY
          : SCREEN_COPY[screen];

  if (
    screen === 'terms' &&
    termsPage === KALSHI_TERMS_PAGE.metamask &&
    !holding
  ) {
    return (
      <KycVerifyIdentity
        onContinue={(disclaimers) => {
          setPartnerDisclaimers(disclaimers);
          setTermsPage(KALSHI_TERMS_PAGE.partners);
        }}
        onExit={() => navigation.goBack()}
        totalSteps={KALSHI_CONSENT_TOTAL_STEPS}
        dataRecipient="kalshi"
        onTermsProgress={reportKalshiMetaMaskTerms}
      />
    );
  }

  if (
    screen === 'terms' &&
    termsPage === KALSHI_TERMS_PAGE.partners &&
    partnerDisclaimers &&
    !holding
  ) {
    return (
      <KycPartnerTerms
        disclaimers={partnerDisclaimers}
        onAgree={() => setTermsPage(KALSHI_TERMS_PAGE.kalshi)}
        onBack={() => setTermsPage(KALSHI_TERMS_PAGE.metamask)}
        totalSteps={KALSHI_CONSENT_TOTAL_STEPS}
        onTermsProgress={reportKalshiMetaMaskTerms}
      />
    );
  }

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
              {screen === 'terms' ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  twClassName="mt-2"
                >
                  {strings('kyc.verify_identity.step_indicator', {
                    current: KALSHI_TERMS_PAGE.kalshi + 1,
                    total: KALSHI_CONSENT_TOTAL_STEPS,
                  })}
                </Text>
              ) : null}
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
          terms?.documents.map((document) => (
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
