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
  formatCancellationEndDate,
  getCancellationTiming,
  toCancellationReason,
  type CancellationTiming,
} from './CancelMembership.utils';
import CancelSurveyStep from './components/CancelSurveyStep';
import CancelSuccessStep from './components/CancelSuccessStep';

type CancelStep = 'survey' | 'success';

const CancelMembership = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [step, setStep] = useState<CancelStep>('survey');
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [stayFeedback, setStayFeedback] = useState('');
  const [otherReasonText, setOtherReasonText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancelledSubscription, setCancelledSubscription] = useState<{
    timing: CancellationTiming;
    endDate: string;
  } | null>(null);
  const isNavigatingRef = useRef(false);
  const isSubmittingRef = useRef(false);

  const handleBack = useCallback(() => {
    if (isSubmittingRef.current) return;
    navigation.goBack();
  }, [navigation]);

  const handleKeepMembership = useCallback(() => {
    if (isSubmittingRef.current) return;
    navigation.goBack();
  }, [navigation]);

  const handleCancelConfirm = useCallback(async () => {
    if (isSubmittingRef.current) return;

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
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const cancellationReason = toCancellationReason(selectedReasonId);

      await controller.cancelSubscription({
        subscriptionId: subscription.id,
        cancelAtPeriodEnd: timing === 'period_end',
        ...(cancellationReason ? { cancellationReason } : {}),
      });

      setCancelledSubscription({
        timing,
        endDate: formatCancellationEndDate(subscription.currentPeriodEnd),
      });
      setStep('success');
    } catch (error) {
      Logger.error(ensureError(error, 'CancelMembership.cancelSubscription'), {
        tags: {
          feature: 'money_account_plus',
          operation: 'cancel_subscription',
        },
      });
      setErrorMessage(strings('pro_hub.cancel_membership.cancellation_failed'));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [selectedReasonId]);

  const handleReasonSelect = useCallback((id: string) => {
    setSelectedReasonId(id);
  }, []);

  const handleStayFeedbackChange = useCallback((value: string) => {
    setStayFeedback(value);
  }, []);

  const handleOtherReasonChange = useCallback((value: string) => {
    setOtherReasonText(value);
  }, []);

  const handleDone = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    // Reset instead of navigate so the stale cancel and membership screens are
    // removed. Period-end cancellation keeps Pro Hub above the origin screen;
    // immediate cancellation returns directly to the origin.
    navigation.dispatch((state) =>
      CommonActions.reset(
        buildPostCancellationResetState(
          state,
          cancelledSubscription?.timing === 'period_end',
        ),
      ),
    );
  }, [cancelledSubscription?.timing, navigation]);

  // Leaving is blocked while the cancel request is in flight (it would still
  // cancel the membership but skip the success step) and once the membership
  // is cancelled (the Membership screen below is now stale).
  const isLeaveBlocked = isSubmitting || step === 'success';

  // Disable iOS swipe-back so the user cannot leave by gesture.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !isLeaveBlocked });
  }, [navigation, isLeaveBlocked]);

  // Intercept any navigation attempt that would remove this screen. Covers
  // programmatic goBack() and acts as defense-in-depth alongside the disabled
  // gesture.
  useEffect(() => {
    if (!isLeaveBlocked) {
      return undefined;
    }
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isNavigatingRef.current) return;
      e.preventDefault();
      if (step === 'success') {
        handleDone();
      }
    });
    return () => unsubscribe();
  }, [isLeaveBlocked, step, navigation, handleDone]);

  // Android hardware back button: swallow it while submitting, and redirect to
  // handleDone on the success step.
  useEffect(() => {
    if (!isLeaveBlocked) {
      return undefined;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (step === 'success') {
          handleDone();
        }
        return true;
      },
    );
    return () => subscription.remove();
  }, [isLeaveBlocked, step, handleDone]);

  return (
    <SafeAreaView
      style={[tw.style('flex-1 bg-background-default')]}
      edges={['top', 'bottom']}
      testID={CancelMembershipTestIds.CONTAINER}
    >
      {step === 'survey' ? (
        <CancelSurveyStep
          selectedReasonId={selectedReasonId}
          stayFeedback={stayFeedback}
          otherReasonText={otherReasonText}
          onReasonSelect={handleReasonSelect}
          onStayFeedbackChange={handleStayFeedbackChange}
          onOtherReasonChange={handleOtherReasonChange}
          onBack={handleBack}
          onKeepMembership={handleKeepMembership}
          onCancelConfirm={handleCancelConfirm}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
        />
      ) : (
        cancelledSubscription && (
          <CancelSuccessStep
            onDone={handleDone}
            timing={cancelledSubscription.timing}
            cancellationEndDate={cancelledSubscription.endDate}
          />
        )
      )}
    </SafeAreaView>
  );
};

export default CancelMembership;
