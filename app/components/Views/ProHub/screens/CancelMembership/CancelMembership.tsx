import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { CancelMembershipTestIds } from './CancelMembership.testIds';
import { buildPostCancellationResetState } from './CancelMembership.utils';
import CancelSurveyStep from './components/CancelSurveyStep';
import CancelSuccessStep from './components/CancelSuccessStep';

type CancelStep = 'survey' | 'success';

const CancelMembership = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [step, setStep] = useState<CancelStep>('survey');
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleKeepMembership = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCancelConfirm = useCallback(() => {
    setStep('success');
  }, []);

  const handleReasonSelect = useCallback((id: string) => {
    setSelectedReasonId(id);
  }, []);

  const handleDone = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    // Reset instead of navigate: navigate() pushes another Pro Hub on top of
    // this success step, so Header back would return here. Reset keeps Pro Hub
    // on top of the screen that started the flow (Money, Wallet, etc.).
    navigation.dispatch((state) =>
      CommonActions.reset(buildPostCancellationResetState(state)),
    );
  }, [navigation]);

  // Once the membership is cancelled (success step), disable iOS swipe-back
  // so the user cannot accidentally return to the now-stale Membership screen.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: step !== 'success' });
  }, [navigation, step]);

  // Intercept any navigation attempt that would remove this screen while
  // on the success step. Covers programmatic goBack() and acts as
  // defense-in-depth alongside the disabled gesture.
  useEffect(() => {
    if (step !== 'success') {
      return undefined;
    }
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isNavigatingRef.current) return;
      e.preventDefault();
      handleDone();
    });
    return () => unsubscribe();
  }, [step, navigation, handleDone]);

  // Android hardware back button: redirect to handleDone on the success step.
  useEffect(() => {
    if (step !== 'success') {
      return undefined;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleDone();
        return true;
      },
    );
    return () => subscription.remove();
  }, [step, handleDone]);

  return (
    <SafeAreaView
      style={[tw.style('flex-1 bg-background-default')]}
      edges={['top', 'bottom']}
      testID={CancelMembershipTestIds.CONTAINER}
    >
      {step === 'survey' ? (
        <CancelSurveyStep
          selectedReasonId={selectedReasonId}
          onReasonSelect={handleReasonSelect}
          onBack={handleBack}
          onKeepMembership={handleKeepMembership}
          onCancelConfirm={handleCancelConfirm}
        />
      ) : (
        <CancelSuccessStep onDone={handleDone} />
      )}
    </SafeAreaView>
  );
};

export default CancelMembership;
