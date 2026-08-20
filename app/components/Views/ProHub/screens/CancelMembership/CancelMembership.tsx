import React, { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { CancelMembershipTestIds } from './CancelMembership.testIds';
import CancelSurveyStep from './components/CancelSurveyStep';
import CancelSuccessStep from './components/CancelSuccessStep';

type CancelStep = 'survey' | 'success';

const CancelMembership = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [step, setStep] = useState<CancelStep>('survey');
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);

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
    navigation.navigate(Routes.PRO_HUB.ROOT, {
      source: 'pro_subscription_cancellation_success',
    });
  }, [navigation]);

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
