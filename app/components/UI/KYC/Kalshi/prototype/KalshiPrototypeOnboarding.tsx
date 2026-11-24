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
import VerifyIdentity from '../../Views/SumSub/VerifyIdentity';
import PartnerTerms from '../../Views/SumSub/PartnerTerms';
import type { KycCatalogDisclaimerLink } from '../../hooks/useKycSessionDisclaimers';
import { nextWaitingPollDelayMs } from '../waitingPoll';
import {
  PROTOTYPE_ENTRY_CHECK_DELAY_MS,
  PROTOTYPE_SUMSUB_LAUNCH_DELAY_MS,
  GEORGE_COPY,
} from './prototypeConstants';
import {
  activateKalshiPrototypeScenario,
  getKalshiPrototypeRuntime,
  getKalshiPrototypeVendorOnboarding,
  prototypeCompleteSumsub,
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
import PhoneCountrySelectorModal from '../../../Ramp/Views/Modals/PhoneCountrySelectorModal';
import {
  clearNativeStackNavigatorOptions,
  transparentModalScreenOptions,
} from '../../../../../constants/navigation/clearStackNavigatorOptions';
import KalshiPrototypeSumsubScreen from './KalshiPrototypeSumsubScreen';
import KalshiPrototypeLoading from './KalshiPrototypeLoading';

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
  const handleSubmit = useCallback(
    async (code: string) => {
      const step = await vendor.verifyEmailOtp({ vendor: 'kalshi', code });
      if (step === 'kalshi_phone_link') {
        navigation.navigate(KalshiPrototypeRoutes.PHONE_ENTRY);
      }
    },
    [navigation],
  );
  const handleResend = useCallback(async () => {
    await vendor.sendEmailOtp({ vendor: 'kalshi' });
  }, []);
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <KalshiPrototypeCodeScreen
      key={remountKey}
      channel="email"
      onSubmit={handleSubmit}
      onResend={handleResend}
      onBack={handleBack}
    />
  );
};

/** The Kalshi phone number, pushing the phone code once it is sent. */
const PhoneEntryStep = () => {
  const navigation = useFlowNavigation();
  const handleSend = useCallback(
    async (phoneNumber: string) => {
      await vendor.sendPhoneOtp({ vendor: 'kalshi', phoneNumber });
      if (getKalshiPrototypeRuntime().script?.phoneCodeSent) {
        navigation.navigate(KalshiPrototypeRoutes.PHONE_CODE);
      }
    },
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
  const handleResend = useCallback(async () => {
    await vendor.sendPhoneOtp({ vendor: 'kalshi' });
  }, []);
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <KalshiPrototypeCodeScreen
      key={remountKey}
      channel="phone"
      onSubmit={handleSubmit}
      onResend={handleResend}
      onBack={handleBack}
    />
  );
};

/**
 * The Sumsub step: the fox loader while the fake presentation "launches",
 * then the mock view, mirroring how `KycSumSub` holds its loader until the
 * SDK presents itself. Its Continue replaces it with the decision.
 */
const SumsubStep = () => {
  const navigation = useFlowNavigation();
  const [isPresented, setIsPresented] = useState(false);
  const hasLaunchedRef = useRef(false);

  useEffect(() => {
    if (hasLaunchedRef.current) {
      return undefined;
    }
    hasLaunchedRef.current = true;
    // The launch promise stays open until the mock's Continue ends it, the
    // way the SDK hand-off stays open until the user finishes.
    void vendor.launchProviderFlow();
    const timer = setTimeout(
      () => setIsPresented(true),
      PROTOTYPE_SUMSUB_LAUNCH_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = useCallback(() => {
    prototypeCompleteSumsub('submitted');
    if (getKalshiPrototypeRuntime().script?.vendor.step === 'decision') {
      navigation.replace(KalshiPrototypeRoutes.DECISION);
    }
  }, [navigation]);

  if (!isPresented) {
    return <KalshiPrototypeLoading />;
  }
  return <KalshiPrototypeSumsubScreen onContinue={handleContinue} />;
};

/**
 * The decision step: VBA's verifying view while the decision is pending,
 * polling the fake the way George's waiting screen polls kyc-api, then VBA's
 * verified view once it approves, in place on the same screen.
 */
const DecisionStep = () => {
  const onLeave = useFlowExit();
  const runtime = useKalshiPrototypeRuntime();
  const isApproved = runtime.script?.vendor.status === 'approved';

  useEffect(() => {
    if (isApproved) {
      return undefined;
    }
    let reads = 0;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      timer = setTimeout(read, nextWaitingPollDelayMs(reads));
    }
    async function read() {
      await vendor.refreshStep({ vendor: 'kalshi' });
      reads += 1;
      if (!stopped) {
        schedule();
      }
    }
    // The first read is immediate, like George's screen reads on open.
    void read();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [isApproved]);

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
      title={GEORGE_COPY.waiting.title}
      description={GEORGE_COPY.waiting.body}
      buttonLabel={GEORGE_COPY.waiting.checkAgain}
      onLeave={onLeave}
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
