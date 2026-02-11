import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import ChecklistItem from './ChecklistItem';
import { useOnboardingChecklist } from '../hooks/useOnboardingChecklist';
import { strings } from '../../../../locales/i18n';

const OnboardingBanner = () => {
  const tw = useTailwind();
  const { steps, completeStep } = useOnboardingChecklist();

  return (
    <Box twClassName="p-4 mx-4 my-2 rounded-xl bg-background-default border border-border-muted shadow-sm">
      <Text
        variant={TextVariant.HeadingSM}
        color={TextColor.Default}
        twClassName="mb-4"
      >
        Complete your setup
      </Text>
      
      <ChecklistItem
        title="Secure your wallet"
        isCompleted={steps.step1}
        onPress={() => completeStep('step1')}
      />
      
      <ChecklistItem
        title="Add funds"
        isCompleted={steps.step2}
        onPress={() => completeStep('step2')}
      />
      
      <ChecklistItem
        title="Try a core action"
        isCompleted={steps.step3}
        onPress={() => completeStep('step3')}
      />
    </Box>
  );
};

export default OnboardingBanner;
