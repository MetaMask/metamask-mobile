import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  PRODUCT_TYPES,
  type Subscription,
} from '@metamask/subscription-controller';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';
import { strings } from '../../../../../../locales/i18n';
import { CancelMembershipTestIds } from './CancelMembership.testIds';
import {
  buildPostCancellationResetState,
  CANCELLATION_TIMINGS,
  getCancellationTiming,
  toCancellationReason,
} from './CancelMembership.utils';
import CancelSurveyStep from './components/CancelSurveyStep';
import CancelStayStep from './components/CancelStayStep';

type CancelStep = 'reason' | 'stay';

const CancelMembership = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [step, setStep] = useState<CancelStep>('reason');
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [stayFeedback, setStayFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  const handleBack = useCallback(() => {
    if (isSubmitting) return;
    if (step === 'stay') {
      setStep('reason');
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
    if (isSubmitting) return;

    const controller = Engine.context.SubscriptionController;
    const subscription: Subscription | undefined =
      controller.getSubscriptionByProduct(PRODUCT_TYPES.MONEY_ACCOUNT_PLUS);
    const timing = subscription
      ? getCancellationTiming(subscription.cancelType)
      : undefined;

    if (!subscription || !timing) {
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
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, selectedReasonId, navigateToProHub]);

  const handleReasonSelect = useCallback((id: string) => {
    setSelectedReasonId(id);
    setStep('stay');
  }, []);

  const handleStayFeedbackChange = useCallback((value: string) => {
    setStayFeedback(value);
  }, []);

  // Leaving is blocked while the cancel request is in flight: it would still
  // cancel the membership but skip the redirect to Pro Hub.
  const isLeaveBlocked = isSubmitting;

  // On the stay step, leaving via back gesture / hardware back should return
  // to the reason step instead of popping the whole screen.
  const shouldInterceptLeave = isLeaveBlocked || step === 'stay';

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
      if (step === 'stay' && !isSubmitting) {
        setStep('reason');
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
        if (step === 'stay' && !isSubmitting) {
          setStep('reason');
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
      {step === 'reason' && (
        <CancelSurveyStep
          selectedReasonId={selectedReasonId}
          onReasonSelect={handleReasonSelect}
          onBack={handleBack}
          onKeepMembership={handleKeepMembership}
          onCancelConfirm={handleCancelConfirm}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
        />
      )}
      {step === 'stay' && (
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
