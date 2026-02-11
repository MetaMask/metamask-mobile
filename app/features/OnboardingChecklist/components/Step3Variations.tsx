import React, { useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import ChecklistItem from './ChecklistItem';
import { useOnboardingChecklist, STEP3_VARIATION } from '../hooks/useOnboardingChecklist';
import Routes from '../../../constants/navigation/Routes';

const Step3Variations = () => {
  const tw = useTailwind();
  const navigation = useNavigation<any>();
  const { steps, step3Variation, completeStep } = useOnboardingChecklist();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAction = (route: string, params?: any) => {
    navigation.navigate(route, params);
    // Shortcut: Complete step when navigating for prototype
    completeStep('step3');
  };

  if (step3Variation === STEP3_VARIATION.SINGLE) {
    return (
      <ChecklistItem
        title="Swap tokens"
        isCompleted={steps.step3}
        onPress={() => handleAction(Routes.RAMP.BUY)} // Using Buy as a proxy for first action
      />
    );
  }

  return (
    <Box>
      <ChecklistItem
        title="Try a core action"
        isCompleted={steps.step3}
        onPress={() => setIsExpanded(!isExpanded)}
      />
      
      {isExpanded && !steps.step3 && (
        <Box twClassName="pl-8 pb-2">
          <ChecklistItem
            title="Set up MetaMask Card"
            isCompleted={false}
            onPress={() => handleAction(Routes.CARD.ROOT)}
          />
          <ChecklistItem
            title="Swap tokens"
            isCompleted={false}
            onPress={() => handleAction(Routes.RAMP.BUY)}
          />
          <ChecklistItem
            title="Explore Predict"
            isCompleted={false}
            onPress={() => handleAction(Routes.PREDICT.ROOT)}
          />
        </Box>
      )}
    </Box>
  );
};

export default Step3Variations;
