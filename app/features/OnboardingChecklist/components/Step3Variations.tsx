import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import ChecklistItem from './ChecklistItem';
import { useOnboardingChecklist } from '../hooks/useOnboardingChecklist';
import Routes from '../../../constants/navigation/Routes';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';

const Step3Variations = () => {
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
      />
      
      {!steps.step3 && (
        <Box twClassName="mt-1 mb-2">
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Md}
            label="Setup MetaMask Card"
            onPress={handleAction}
            width={ButtonWidthTypes.Full}
          />
        </Box>
      )}
    </Box>
  );
};

export default Step3Variations;
