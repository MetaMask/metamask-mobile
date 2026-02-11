import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import ChecklistItem, { ChecklistItemVariant } from './ChecklistItem';
import { useOnboardingChecklist } from '../hooks/useOnboardingChecklist';
import Routes from '../../../constants/navigation/Routes';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';

interface Step3VariationsProps {
  variant?: ChecklistItemVariant;
  isPulsing?: boolean;
}

const Step3Variations = ({
  variant = ChecklistItemVariant.Default,
  isPulsing = false,
}: Step3VariationsProps) => {
  const tw = useTailwind();
  const navigation = useNavigation<any>();
  const { steps, completeStep } = useOnboardingChecklist();

  const handleAction = () => {
    navigation.navigate(Routes.CARD.ROOT);
    // Mark as complete for the prototype demo
    completeStep('step3');
  };

  return (
    <Box>
      <ChecklistItem
        title="Setup MetaMask Card"
        isCompleted={steps.step3}
        onPress={steps.step3 ? undefined : handleAction}
        variant={variant}
        isPulsing={isPulsing}
      />
    </Box>
  );
};

export default Step3Variations;
