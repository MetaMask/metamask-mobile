import React, { useState, useEffect } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useOnboardingChecklist } from '../hooks/useOnboardingChecklist';
import OnboardingCard from './OnboardingCard';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

const OnboardingDeck = () => {
  const { steps, completeStep } = useOnboardingChecklist();
  const navigation = useNavigation<any>();
  const [index, setIndex] = useState(0);

  const deckSteps = [
    {
      id: 'step1' as const,
      label: 'Secure your wallet',
      desc: 'Protect your assets with a Secret Recovery Phrase.',
      color: 'bg-primary-default',
      icon: IconName.SecurityTick,
      route: Routes.FAKE_SRP,
    },
    {
      id: 'step2' as const,
      label: 'Fund your account',
      desc: 'Deposit ETH to start interacting with the web3 world.',
      color: 'bg-info-default',
      icon: IconName.Add,
      route: Routes.RAMP.BUY,
    },
    {
      id: 'step3' as const,
      label: 'Setup MetaMask Card',
      desc: 'Spend your crypto anywhere with the MetaMask Card.',
      color: 'bg-warning-default',
      icon: IconName.Card,
      route: Routes.CARD.ROOT,
    }
  ];

  const currentStep = deckSteps[index];
  const isCompleted = steps[currentStep.id];

  const handleAccept = () => {
    if (!isCompleted) {
      if (currentStep.id === 'step2') {
        completeStep('step2');
      }
      navigation.navigate(currentStep.route);
    }
  };

  const handleSkip = () => {
    setIndex((prev) => (prev + 1) % deckSteps.length);
  };

  // Auto-advance logic
  useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(() => {
        setIndex((prev) => (prev + 1) % deckSteps.length);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, deckSteps.length]);

  return (
    <OnboardingCard
      {...currentStep}
      isCompleted={isCompleted}
      onAccept={handleAccept}
      onSkip={handleSkip}
      index={index}
      total={deckSteps.length}
    />
  );
};

export default OnboardingDeck;
