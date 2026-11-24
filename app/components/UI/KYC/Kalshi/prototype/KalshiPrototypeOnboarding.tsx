// PROTOTYPE-DO-NOT-MERGE
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Box,
  HeaderStandard,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import KycPending from '../../Views/Status/KycPending';
import KycIdentityVerified from '../../Views/Status/IdentityVerified';
import KycRejected from '../../Views/Status/KycRejected';
import { showKycSumSubLaunchError } from '../../Views/SumSub/SumSubKyc';
import VerifyIdentity from '../../Views/SumSub/VerifyIdentity';
import PartnerTerms from '../../Views/SumSub/PartnerTerms';
import type { KycCatalogDisclaimerLink } from '../../hooks/useKycSessionDisclaimers';
import {
  PROTOTYPE_ENTRY_CHECK_DELAY_MS,
  PROTOTYPE_SUMSUB_LAUNCH_DELAY_MS,
  PROTOTYPE_VERIFYING_DELAY_MS,
  GEORGE_COPY,
} from './prototypeConstants';
import {
  activateKalshiPrototypeScenario,
  getKalshiPrototypeRuntime,
  getKalshiPrototypeVendorOnboarding,
  prototypeCompleteSumsub,
  retryKalshiPrototypeSumsub,
} from './prototypeRuntime';
import {
  KalshiPrototypeRoutes,
  getKalshiPrototypeRouteForScript,
  type KalshiPrototypeParamList,
} from './prototypeRoutes';
import { useKalshiPrototypeRuntime } from './useKalshiPrototype';
import KalshiPrototypeUkycCheck from './KalshiPrototypeUkycCheck';
import KalshiPrototypeVendorTerms from './KalshiPrototypeTerms';
import KalshiPrototypeCodeScreen from './KalshiPrototypeCodeScreen';
import KalshiPrototypePhoneEntry from './KalshiPrototypePhoneEntry';
import KalshiPrototypeEmailEntry from './KalshiPrototypeEmailEntry';
import PhoneCountrySelectorModal from '../../../Ramp/Views/Modals/PhoneCountrySelectorModal';
import {
  clearNativeStackNavigatorOptions,
  transparentModalScreenOptions,
} from '../../../../../constants/navigation/clearStackNavigatorOptions';
import KalshiPrototypeSumsubScreen from './KalshiPrototypeSumsubScreen';
import { strings } from '../../../../../../locales/i18n';
import KalshiPrototypeLoading from './KalshiPrototypeLoading';
import KalshiPrototypeStepUp from './KalshiPrototypeStepUp';
import { sendCodeWithRetryDialog } from './codeNotSentAlert';

const vendor = getKalshiPrototypeVendorOnboarding();

/**
 * The terms pages in the Kalshi flow: VBA's two identity pages, then the
 * Kalshi terms page ("Step 3 of 3").
 */
const KALSHI_PROTOTYPE_TOTAL_STEPS = 3;

const Stack = createNativeStackNavigator<KalshiPrototypeParamList>();

type FlowNavigation = NativeStackNavigationProp<KalshiPrototypeParamList>;

/** Leaves the whole flow, back to the screen that opened it. */
const KalshiPrototypeExitContext = createContext<(() => void) | null>(null);

const useFlowExit = (): (() => void) => {
  const onExit = useContext(KalshiPrototypeExitContext);
  if (!onExit) {
    throw new Error('Kalshi prototype screens need the flow exit');
  }
  return onExit;
};

const useFlowNavigation = () => useNavigation<FlowNavigation>();

/**
 * A key that changes once the screen has been covered by the next push, so
 * a code screen starts fresh (empty boxes, not busy) when back returns to
 * it rather than showing the code already accepted. The swap happens while
 * the screen is hidden.
 *
 * @returns The key to put on the reused view.
 */
const useRemountKeyWhenCovered = () => {
  const navigation = useFlowNavigation();
  const [key, setKey] = useState(0);

  useEffect(
    () =>
      navigation.addListener('transitionEnd', (event) => {
        if (event.data.closing) {
          setKey((current) => current + 1);
        }
      }),
    [navigation],
  );

  return key;
};

/** A friendly dead end for a step the prototype has no view for, with a way back when given one. */
const KalshiPrototypeMessage = ({
  message,
  onBack,
}: {
  message: string;
  onBack?: () => void;
}) => {
  const tw = useTailwind();
  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      {onBack ? (
        <HeaderStandard
          onBack={onBack}
          backButtonProps={{ testID: 'kalshi-prototype-message-back' }}
        />
      ) : null}
      <Box twClassName="flex-1 items-center justify-center px-4">
        <Text variant={TextVariant.BodyMd}>{message}</Text>
      </Box>
    </SafeAreaView>
  );
};

/** The UKYC check: arming the answered scenario, then pushing its first page. */
const UkycCheckStep = () => {
  const navigation = useFlowNavigation();
  const handleAnswered = useCallback(
    (hasCompletedUkyc: boolean) => {
      activateKalshiPrototypeScenario(
        hasCompletedUkyc ? 'returningUkycUser' : 'newUserHasMfa',
      );
      const next = getKalshiPrototypeRouteForScript(
        getKalshiPrototypeRuntime().script,
      );
      if (next) {
        navigation.navigate(next);
      }
    },
    [navigation],
  );

  return <KalshiPrototypeUkycCheck onAnswered={handleAnswered} />;
};

/** VBA's consent page (step 1 of 2), pushing the partners page. */
const ConsentStep = () => {
  const navigation = useFlowNavigation();
  const handleContinue = useCallback(
    (disclaimers: KycCatalogDisclaimerLink[]) =>
      navigation.navigate(KalshiPrototypeRoutes.PARTNER_TERMS, {
        disclaimers,
      }),
    [navigation],
  );
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <VerifyIdentity
      onContinue={handleContinue}
      onExit={handleBack}
      totalSteps={KALSHI_PROTOTYPE_TOTAL_STEPS}
      dataRecipient="kalshi"
    />
  );
};

/** VBA's idOS / verification partners page (step 2 of 2). */
const PartnerTermsStep = () => {
  const navigation = useFlowNavigation();
  const { params } =
    useRoute<
      RouteProp<
        KalshiPrototypeParamList,
        typeof KalshiPrototypeRoutes.PARTNER_TERMS
      >
    >();
  const handleAgree = useCallback(
    () => navigation.navigate(KalshiPrototypeRoutes.VENDOR_TERMS),
    [navigation],
  );
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <PartnerTerms
      disclaimers={params.disclaimers}
      onAgree={handleAgree}
      onBack={handleBack}
      totalSteps={KALSHI_PROTOTYPE_TOTAL_STEPS}
    />
  );
};

/**
 * The Kalshi terms page (step 3 of 3), pushing the email code once the
 * session opens. It keeps its own state when back returns to it, so the
 * Socure tick stays as the user left it.
 */
const VendorTermsStep = () => {
  const navigation = useFlowNavigation();
  const handleAccepted = useCallback(async () => {
    await vendor.submitTerms({ vendor: 'kalshi' });
    const step = await vendor.startSession({ vendor: 'kalshi' });
    if (step === 'kalshi_email_link') {
      navigation.navigate(KalshiPrototypeRoutes.EMAIL_CODE);
    }
    return true;
  }, [navigation]);
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <KalshiPrototypeVendorTerms
      onAccepted={handleAccepted}
      onBack={handleBack}
    />
  );
};

/** The Kalshi email code, pushing the phone step once it is accepted. */
const EmailCodeStep = () => {
  const navigation = useFlowNavigation();
  const remountKey = useRemountKeyWhenCovered();
  const route =
    useRoute<
      RouteProp<
        KalshiPrototypeParamList,
        typeof KalshiPrototypeRoutes.EMAIL_CODE
      >
    >();
  const email = route.params?.email;
  const handleSubmit = useCallback(
    async (code: string) => {
      const step = await vendor.verifyEmailOtp({ vendor: 'kalshi', code });
      if (step === 'kalshi_phone_link') {
        navigation.navigate(KalshiPrototypeRoutes.PHONE_ENTRY);
      }
    },
    [navigation],
  );
  const handleResend = useCallback(
    () =>
      sendCodeWithRetryDialog('email', async () => {
        await vendor.sendEmailOtp({ vendor: 'kalshi', email });
      }),
    [email],
  );
  const handleUseDifferentEmail = useCallback(
    () => navigation.navigate(KalshiPrototypeRoutes.EMAIL_ENTRY),
    [navigation],
  );
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <KalshiPrototypeCodeScreen
      key={`${remountKey}-${email ?? ''}`}
      channel="email"
      email={email}
      // Once the Kalshi account email is in, there is no other to switch to.
      hideUseDifferentEmail={email !== undefined}
      onUseDifferentEmail={handleUseDifferentEmail}
      onSubmit={handleSubmit}
      onResend={handleResend}
      onBack={handleBack}
    />
  );
};

/** A different email for the Kalshi code, back on the code screen once sent. */
const EmailEntryStep = () => {
  const navigation = useFlowNavigation();
  const handleSend = useCallback(
    (email: string) =>
      sendCodeWithRetryDialog('email', async () => {
        await vendor.sendEmailOtp({ vendor: 'kalshi', email });
        // Back to the code screen, now showing the new address.
        navigation.navigate(KalshiPrototypeRoutes.EMAIL_CODE, { email });
      }),
    [navigation],
  );
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return <KalshiPrototypeEmailEntry onSend={handleSend} onBack={handleBack} />;
};

/** The Kalshi phone number, pushing the phone code once it is sent. */
const PhoneEntryStep = () => {
  const navigation = useFlowNavigation();
  const handleSend = useCallback(
    (phoneNumber: string, displayNumber: string) =>
      sendCodeWithRetryDialog('phone', async () => {
        await vendor.sendPhoneOtp({ vendor: 'kalshi', phoneNumber });
        if (getKalshiPrototypeRuntime().script?.phoneCodeSent) {
          navigation.navigate(KalshiPrototypeRoutes.PHONE_CODE, {
            phoneNumber: displayNumber,
          });
        }
      }),
    [navigation],
  );
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return <KalshiPrototypePhoneEntry onSend={handleSend} onBack={handleBack} />;
};

/**
 * The Kalshi phone code. Once accepted, the stack resets to the next step
 * (Sumsub, or the decision for an idOS identity), so back never returns to
 * the terms and codes already done, the way VBA resets to its provider.
 */
const PhoneCodeStep = () => {
  const navigation = useFlowNavigation();
  const remountKey = useRemountKeyWhenCovered();
  const route =
    useRoute<
      RouteProp<
        KalshiPrototypeParamList,
        typeof KalshiPrototypeRoutes.PHONE_CODE
      >
    >();
  const phoneNumber = route.params?.phoneNumber;
  const handleSubmit = useCallback(
    async (code: string) => {
      const step = await vendor.verifyPhoneOtp({ vendor: 'kalshi', code });
      if (step === 'sumsub' || step === 'decision') {
        navigation.reset({
          index: 0,
          routes: [
            {
              name:
                step === 'sumsub'
                  ? KalshiPrototypeRoutes.SUMSUB
                  : KalshiPrototypeRoutes.DECISION,
            },
          ],
        });
      }
    },
    [navigation],
  );
  const handleResend = useCallback(
    () =>
      sendCodeWithRetryDialog('phone', async () => {
        await vendor.sendPhoneOtp({ vendor: 'kalshi' });
      }),
    [],
  );
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <KalshiPrototypeCodeScreen
      key={remountKey}
      channel="phone"
      phoneNumber={phoneNumber}
      onSubmit={handleSubmit}
      onResend={handleResend}
      onBack={handleBack}
    />
  );
};

/**
 * The Level 2 step-up page. Continue swaps it for Sumsub; Not now and back
 * leave the flow, and the card still shows We need more info.
 */
const StepUpStep = () => {
  const navigation = useFlowNavigation();
  const onLeave = useFlowExit();
  const handleContinue = useCallback(
    () => navigation.replace(KalshiPrototypeRoutes.SUMSUB),
    [navigation],
  );
  return (
    <KalshiPrototypeStepUp onContinue={handleContinue} onNotNow={onLeave} />
  );
};

/**
 * The Sumsub step: the fox loader while the fake presentation "launches",
 * then the mock view, mirroring how `KycSumSub` holds its loader until the
 * SDK presents itself. Its Continue replaces it with the decision.
 */
const SumsubStep = () => {
  const navigation = useFlowNavigation();
  const onLeave = useFlowExit();
  const [isPresented, setIsPresented] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const launchedAttemptRef = useRef(-1);

  useEffect(() => {
    if (launchedAttemptRef.current === attempt) {
      return undefined;
    }
    launchedAttemptRef.current = attempt;
    // Developer Options can make the launch fail, the way `useLaunchSumSub`
    // fails on a consent or provider error: the same error view, no code.
    const willFail = getKalshiPrototypeRuntime().failSumsubLaunch;
    if (!willFail) {
      // The launch promise stays open until the mock's Continue ends it, the
      // way the SDK hand-off stays open until the user finishes.
      void vendor.launchProviderFlow();
    }
    const timer = setTimeout(() => {
      if (willFail) {
        setHasError(true);
      } else {
        setIsPresented(true);
      }
    }, PROTOTYPE_SUMSUB_LAUNCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [attempt]);

  const handleContinue = useCallback(() => {
    prototypeCompleteSumsub('submitted');
    if (getKalshiPrototypeRuntime().script?.vendor.step === 'decision') {
      navigation.replace(KalshiPrototypeRoutes.DECISION);
    }
  }, [navigation]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setAttempt((value) => value + 1);
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    onLeave();
  }, [navigation, onLeave]);

  useEffect(() => {
    if (hasError) {
      // KycSumSub's own native retry dialog, over the loader.
      showKycSumSubLaunchError({ onRetry: handleRetry, onCancel: handleBack });
    }
  }, [hasError, handleRetry, handleBack]);

  if (!isPresented || hasError) {
    return <KalshiPrototypeLoading />;
  }
  return <KalshiPrototypeSumsubScreen onContinue={handleContinue} />;
};

/**
 * The decision step: VBA's verifying view while the decision is pending,
 * waiting 10 seconds for the fake review (closing it leaves it pending), then VBA's
 * verified view once it approves, in place on the same screen.
 */
const DecisionStep = () => {
  const onLeave = useFlowExit();
  const runtime = useKalshiPrototypeRuntime();
  const navigation = useFlowNavigation();
  const status = runtime.script?.vendor.status;
  const isApproved = status === 'approved';

  // The review comes back after a fixed wait, so the verifying screen can be
  // looked at and closed. Closing leaves the review pending, and the card
  // shows Verifying your identity.
  useEffect(() => {
    if (status !== 'pending') {
      return undefined;
    }
    let stopped = false;
    const timer = setTimeout(async () => {
      // The fake answers after a couple of reads; read until it does.
      for (let read = 0; read < 5 && !stopped; read += 1) {
        await vendor.refreshStep({ vendor: 'kalshi' });
        if (getKalshiPrototypeRuntime().script?.vendor.status !== 'pending') {
          break;
        }
      }
    }, PROTOTYPE_VERIFYING_DELAY_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [status]);

  if (status === 'rejected') {
    // VBA's terminal rejection: KycRejected with Contact support.
    return <KycRejected action="contactSupport" onAction={onLeave} />;
  }
  if (status === 'retry') {
    // VBA's retry rejection: KycRejected with Try again, back into Sumsub.
    return (
      <KycRejected
        action="retry"
        onAction={() => {
          retryKalshiPrototypeSumsub();
          navigation.replace(KalshiPrototypeRoutes.SUMSUB);
        }}
      />
    );
  }
  if (isApproved) {
    return (
      <KycIdentityVerified
        title={GEORGE_COPY.done.title}
        description={GEORGE_COPY.done.body}
        onExit={onLeave}
        onContinue={onLeave}
      />
    );
  }
  return (
    <KycPending
      description={strings('kyc.kyc_taking_longer.description_few_minutes')}
      buttonLabel={strings('kyc.kyc_taking_longer.button')}
      onLeave={onLeave}
      onClose={onLeave}
    />
  );
};

/**
 * The flow's nested stack, one screen per step, opening on the step the fake
 * script is on. Forward steps push; back pops one step (and leaves the flow
 * from the first screen).
 */
const KalshiPrototypeFlowStack = () => {
  // Read once: later script changes move the stack by navigation, not by
  // swapping the initial screen.
  const [initialRouteName] = useState(() =>
    getKalshiPrototypeRouteForScript(getKalshiPrototypeRuntime().script),
  );
  // The entry status check (UKYC and Kalshi link): the fox loader with no
  // copy, as in Paper 95O, before the stack opens on its first step.
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  useEffect(() => {
    const timer = setTimeout(
      () => setIsCheckingStatus(false),
      PROTOTYPE_ENTRY_CHECK_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  if (isCheckingStatus) {
    return <KalshiPrototypeLoading />;
  }

  if (!initialRouteName) {
    return (
      <KalshiPrototypeMessage
        message={`[PROTO] The prototype has no view for step ${String(
          getKalshiPrototypeRuntime().script?.vendor.step,
        )}.`}
      />
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name={KalshiPrototypeRoutes.UKYC_CHECK}
        component={UkycCheckStep}
      />
      <Stack.Screen
        name={KalshiPrototypeRoutes.CONSENT}
        component={ConsentStep}
      />
      <Stack.Screen
        name={KalshiPrototypeRoutes.PARTNER_TERMS}
        component={PartnerTermsStep}
      />
      <Stack.Screen
        name={KalshiPrototypeRoutes.VENDOR_TERMS}
        component={VendorTermsStep}
      />
      <Stack.Screen
        name={KalshiPrototypeRoutes.EMAIL_CODE}
        component={EmailCodeStep}
      />
      <Stack.Screen
        name={KalshiPrototypeRoutes.EMAIL_ENTRY}
        component={EmailEntryStep}
      />
      <Stack.Screen
        name={KalshiPrototypeRoutes.PHONE_ENTRY}
        component={PhoneEntryStep}
      />
      <Stack.Screen
        name={KalshiPrototypeRoutes.PHONE_COUNTRY}
        component={PhoneCountrySelectorModal}
        options={{
          ...transparentModalScreenOptions,
          ...clearNativeStackNavigatorOptions,
        }}
      />
      <Stack.Screen
        name={KalshiPrototypeRoutes.PHONE_CODE}
        component={PhoneCodeStep}
      />
      <Stack.Screen
        name={KalshiPrototypeRoutes.STEP_UP}
        component={StepUpStep}
      />
      <Stack.Screen
        name={KalshiPrototypeRoutes.SUMSUB}
        component={SumsubStep}
      />
      <Stack.Screen
        name={KalshiPrototypeRoutes.DECISION}
        component={DecisionStep}
      />
    </Stack.Navigator>
  );
};

/**
 * The prototype's Kalshi onboarding flow, built from the views the app
 * already has and stacked the way VBA's identity verification is: the UKYC
 * check branches; the terms reuse the VBA consent and partner views; the
 * codes ride the shared MFA code-entry view with the partner variant on;
 * Sumsub is a mock; the verifying and verified views are VBA's.
 *
 * @returns The flow.
 */
const KalshiPrototypeOnboarding = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { active } = useKalshiPrototypeRuntime();

  const leave = useCallback(() => navigation.goBack(), [navigation]);

  if (!active) {
    return (
      <KalshiPrototypeMessage
        message="[PROTO] Kalshi prototype is off. Turn it on from Developer Options."
        onBack={leave}
      />
    );
  }

  return (
    <KalshiPrototypeExitContext.Provider value={leave}>
      <KalshiPrototypeFlowStack />
    </KalshiPrototypeExitContext.Provider>
  );
};

export default KalshiPrototypeOnboarding;
