import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import ChecklistItem from './ChecklistItem';
import Step3Variations from './Step3Variations';
import { useOnboardingChecklist } from '../hooks/useOnboardingChecklist';
import Routes from '../../../constants/navigation/Routes';

const OnboardingBanner = () => {
  const tw = useTailwind();
  const navigation = useNavigation<any>();
  const { steps } = useOnboardingChecklist();

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
        onPress={() => navigation.navigate(Routes.ONBOARDING.NAV)}
      />
      
      <ChecklistItem
        title="Add funds"
        isCompleted={steps.step2}
        onPress={() => navigation.navigate(Routes.RAMP.BUY)}
      />
      
      <Step3Variations />
    </Box>
  );
};

export default OnboardingBanner;
