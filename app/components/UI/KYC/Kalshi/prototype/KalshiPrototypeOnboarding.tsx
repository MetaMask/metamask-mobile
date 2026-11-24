// PROTOTYPE-DO-NOT-MERGE
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import KycPending from '../../Views/Status/KycPending';
import KycIdentityVerified from '../../Views/Status/IdentityVerified';
import { nextWaitingPollDelayMs } from '../waitingPoll';
import {
  PROTOTYPE_SUMSUB_LAUNCH_DELAY_MS,
  GEORGE_COPY,
} from './prototypeConstants';
import {
  activateKalshiPrototypeScenario,
  getKalshiPrototypeVendorOnboarding,
  prototypeCompleteSumsub,
} from './prototypeRuntime';
import { useKalshiPrototypeRuntime } from './useKalshiPrototype';
import KalshiPrototypeUkycCheck from './KalshiPrototypeUkycCheck';
import KalshiPrototypeTermsFlow from './KalshiPrototypeTerms';
import KalshiPrototypeCodeScreen from './KalshiPrototypeCodeScreen';
import KalshiPrototypePhoneEntry from './KalshiPrototypePhoneEntry';
import KalshiPrototypeSumsubScreen from './KalshiPrototypeSumsubScreen';
import KalshiPrototypeLoading from './KalshiPrototypeLoading';

const vendor = getKalshiPrototypeVendorOnboarding();

/**
 * The Sumsub step: the fox loader while the fake presentation "launches",
 * then the mock view, mirroring how `KycSumSub` holds its loader until the
 * SDK presents itself.
 */
const KalshiPrototypeSumsubStep = ({
  onContinue,
}: {
  onContinue: () => void;
}) => {
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

  if (!isPresented) {
    return <KalshiPrototypeLoading />;
  }
  return <KalshiPrototypeSumsubScreen onContinue={onContinue} />;
};

/**
 * The decision step: VBA's verifying view while the decision is pending,
 * polling the fake the way George's waiting screen polls kyc-api, then VBA's
 * verified view once it approves.
 */
const KalshiPrototypeDecisionStep = ({
  status,
  onLeave,
}: {
  status: 'none' | 'pending' | 'approved' | 'rejected' | 'retry' | null;
  onLeave: () => void;
}) => {
  const isApproved = status === 'approved';

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
 * The prototype's Kalshi onboarding flow: one route that shows whatever the
 * fake script says is next, built from the views the app already has. The
 * UKYC check branches; the terms reuse the VBA consent and partner views;
 * the codes ride the shared MFA code-entry view with the partner variant on;
 * Sumsub is a mock; the verifying and verified views are VBA's.
 *
 * @returns The flow screen.
 */
const KalshiPrototypeOnboarding = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const runtime = useKalshiPrototypeRuntime();

  const leave = useCallback(() => navigation.goBack(), [navigation]);

  if (!runtime.active) {
    return (
      <SafeAreaView style={tw.style('flex-1 bg-default')}>
        <Box twClassName="flex-1 items-center justify-center px-4">
          <Text variant={TextVariant.BodyMd}>
            [PROTO] Kalshi prototype is off. Turn it on from Developer Options.
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  if (!runtime.script) {
    return (
      <KalshiPrototypeUkycCheck
        onAnswered={(hasCompletedUkyc) =>
          activateKalshiPrototypeScenario(
            hasCompletedUkyc ? 'returningUkycUser' : 'newUserHasMfa',
          )
        }
      />
    );
  }

  const { vendor: vendorState } = runtime.script;

  if (vendorState.step === 'terms') {
    return (
      <KalshiPrototypeTermsFlow
        onAccepted={async () => {
          await vendor.submitTerms({ vendor: 'kalshi' });
          await vendor.startSession({ vendor: 'kalshi' });
          return true;
        }}
        onExit={leave}
      />
    );
  }

  if (vendorState.step === 'kalshi_email_link') {
    if (!vendorState.sessionId) {
      // Leg 1 has no email entry: the terms accept opens the session with
      // the verified email, so a link step without a session cannot occur.
      return <KalshiPrototypeLoading />;
    }
    return (
      <KalshiPrototypeCodeScreen
        channel="email"
        onSubmit={async (code) => {
          await vendor.verifyEmailOtp({ vendor: 'kalshi', code });
        }}
        onResend={async () => {
          await vendor.sendEmailOtp({ vendor: 'kalshi' });
        }}
        onBack={leave}
      />
    );
  }

  if (vendorState.step === 'kalshi_phone_link') {
    return runtime.script.phoneCodeSent ? (
      <KalshiPrototypeCodeScreen
        channel="phone"
        onSubmit={async (code) => {
          await vendor.verifyPhoneOtp({ vendor: 'kalshi', code });
        }}
        onResend={async () => {
          await vendor.sendPhoneOtp({ vendor: 'kalshi' });
        }}
        onBack={leave}
      />
    ) : (
      <KalshiPrototypePhoneEntry
        onSend={async (phoneNumber) => {
          await vendor.sendPhoneOtp({ vendor: 'kalshi', phoneNumber });
        }}
        onBack={leave}
      />
    );
  }

  if (vendorState.step === 'sumsub') {
    return (
      <KalshiPrototypeSumsubStep
        onContinue={() => prototypeCompleteSumsub('submitted')}
      />
    );
  }

  if (vendorState.step === 'decision') {
    return (
      <KalshiPrototypeDecisionStep
        status={vendorState.status}
        onLeave={leave}
      />
    );
  }

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <Box twClassName="flex-1 items-center justify-center px-4">
        <Text variant={TextVariant.BodyMd}>
          {`[PROTO] The prototype has no view for step ${String(vendorState.step)}.`}
        </Text>
      </Box>
    </SafeAreaView>
  );
};

export default KalshiPrototypeOnboarding;
