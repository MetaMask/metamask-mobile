import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PRODUCT_TYPES } from '@metamask/subscription-controller';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';
import { strings } from '../../../../../../locales/i18n';
import { CANCEL_REASONS } from './CancelMembership.constants';
import { CancelMembershipTestIds } from './CancelMembership.testIds';
import {
  buildPostCancellationResetState,
  CANCELLATION_TIMINGS,
  getCancellationTiming,
  shuffleCancelReasons,
  toCancellationReason,
} from './CancelMembership.utils';
import CancelSurveyStep from './components/CancelSurveyStep';
import CancelStayStep from './components/CancelStayStep';

const CANCEL_STEPS = {
  REASON: 'reason',
  STAY: 'stay',
} as const;

type CancelStep = (typeof CANCEL_STEPS)[keyof typeof CANCEL_STEPS];

const CancelMembership = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [orderedReasons] = useState(() => shuffleCancelReasons(CANCEL_REASONS));
  const [step, setStep] = useState<CancelStep>(CANCEL_STEPS.REASON);
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [stayFeedback, setStayFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  const handleBack = useCallback(() => {
    if (isSubmitting) return;
    if (step === CANCEL_STEPS.STAY) {
      setStep(CANCEL_STEPS.REASON);
      return;
    }
    navigation.goBack();
  }, [isSubmitting, step, navigation]);

  const handleKeepMembership = useCallback(() => {
    if (isSubmitting) return;
    // Mark as intentionally leaving so the stay-step beforeRemove interception
    // does not redirect this back to the reason step.
    isNavigatingRef.current = true;
    navigation.goBack();
  }, [isSubmitting, navigation]);

  const navigateToProHub = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    // Reset instead of navigate so the stale cancel and membership screens are
    // removed and Pro Hub sits directly above the origin screen.
    navigation.dispatch((state) =>
      CommonActions.reset(buildPostCancellationResetState(state)),
    );
  }, [navigation]);

  const handleCancelConfirm = useCallback(async () => {
    if (isSubmitting || isNavigatingRef.current) return;

    const controller = Engine.context.SubscriptionController;
    const subscription = controller.getSubscriptionByProduct(
      PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
    );
    const currentPeriodEnd = subscription?.currentPeriodEnd;
    const timing = getCancellationTiming(subscription?.cancelType);

    if (!subscription || !timing || !currentPeriodEnd) {
      setErrorMessage(
        strings('pro_hub.cancel_membership.cancellation_unavailable'),
      );
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const cancellationReason = toCancellationReason(selectedReasonId);

      await controller.cancelSubscription({
        subscriptionId: subscription.id,
        cancelAtPeriodEnd: timing === CANCELLATION_TIMINGS.PERIOD_END,
        ...(cancellationReason ? { cancellationReason } : {}),
      });

      navigateToProHub();
    } catch (error) {
      Logger.error(ensureError(error, 'CancelMembership.cancelSubscription'), {
        tags: {
          feature: 'money_account_plus',
          operation: 'cancel_subscription',
        },
      });
      setErrorMessage(strings('pro_hub.cancel_membership.cancellation_failed'));
      setIsSubmitting(false);
    }
  }, [isSubmitting, selectedReasonId, navigateToProHub]);

  const handleReasonSelect = useCallback((id: string) => {
    setSelectedReasonId(id);
    setStep(CANCEL_STEPS.STAY);
  }, []);

  const handleStayFeedbackChange = useCallback((value: string) => {
    setStayFeedback(value);
  }, []);

  // Leaving is blocked while the cancel request is in flight: it would still
  // cancel the membership but skip the redirect to Pro Hub.
  const isLeaveBlocked = isSubmitting;

  // On the stay step, leaving via back gesture / hardware back should return
  // to the reason step instead of popping the whole screen.
  const shouldInterceptLeave = isLeaveBlocked || step === CANCEL_STEPS.STAY;

  // Disable iOS swipe-back so the user cannot leave by gesture.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !isLeaveBlocked });
  }, [navigation, isLeaveBlocked]);

  // Intercept any navigation attempt that would remove this screen. Covers
  // programmatic goBack() and acts as defense-in-depth alongside the disabled
  // gesture.
  useEffect(() => {
    if (!shouldInterceptLeave) {
      return undefined;
    }
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isNavigatingRef.current) return;
      e.preventDefault();
      if (step === CANCEL_STEPS.STAY && !isSubmitting) {
        setStep(CANCEL_STEPS.REASON);
      }
    });
    return () => unsubscribe();
  }, [shouldInterceptLeave, step, isSubmitting, navigation]);

  // Android hardware back button: swallow it while submitting and return to
  // the reason step from the stay step.
  useEffect(() => {
    if (!shouldInterceptLeave) {
      return undefined;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (step === CANCEL_STEPS.STAY && !isSubmitting) {
          setStep(CANCEL_STEPS.REASON);
        }
        return true;
      },
    );
    return () => subscription.remove();
  }, [shouldInterceptLeave, step, isSubmitting]);

  return (
    <SafeAreaView
      style={[tw.style('flex-1 bg-background-default')]}
      edges={['top', 'bottom']}
      testID={CancelMembershipTestIds.CONTAINER}
    >
      {step === CANCEL_STEPS.REASON && (
        <CancelSurveyStep
          reasons={orderedReasons}
          selectedReasonId={selectedReasonId}
          onReasonSelect={handleReasonSelect}
          onBack={handleBack}
          onKeepMembership={handleKeepMembership}
          onCancelConfirm={handleCancelConfirm}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
        />
      )}
      {step === CANCEL_STEPS.STAY && (
        <CancelStayStep
          stayFeedback={stayFeedback}
          onStayFeedbackChange={handleStayFeedbackChange}
          onBack={handleBack}
          onKeepMembership={handleKeepMembership}
          onCancelConfirm={handleCancelConfirm}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
        />
      )}
    </SafeAreaView>
  );
};

export default CancelMembership;
