import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import ChecklistItem, { ChecklistItemVariant } from './ChecklistItem';
import Step3Variations from './Step3Variations';
import { useOnboardingChecklist } from '../hooks/useOnboardingChecklist';
import Routes from '../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';

interface OnboardingJourneyScreenProps {
  onClose?: () => void;
  onSecureWallet: () => void;
}

const OnboardingJourneyScreen = ({ onClose, onSecureWallet }: OnboardingJourneyScreenProps) => {
  const tw = useTailwind();
  const navigation = useNavigation<any>();
  const { steps, completeStep } = useOnboardingChecklist();

  const handleAddFunds = () => {
    completeStep('step2');
    navigation.navigate(Routes.RAMP.BUY);
    onClose?.();
  };

  const completedCount = Object.values(steps).filter(Boolean).length;

  return (
    <Box twClassName="flex-1 bg-background-default">
      <Box twClassName="flex-row items-center p-4 border-b border-border-muted">
        <Box style={tw.style('flex-1')}>
          <Text variant={TextVariant.HeadingMD}>Your Onboarding Journey</Text>
        </Box>
        <Button
          variant={ButtonVariants.Link}
          size={ButtonSize.Sm}
          label="Close"
          onPress={onClose}
        />
      </Box>

      <Box twClassName="p-6">
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative} twClassName="mb-8">
          Complete these steps to get the most out of MetaMask.
          {completedCount} of 3 completed.
        </Text>

        <ChecklistItem
          title="Secure your wallet"
          isCompleted={steps.step1}
          onPress={() => {
            onSecureWallet();
          }}
          variant={ChecklistItemVariant.Glass}
        />

        <ChecklistItem
          title="Add funds to your account"
          isCompleted={steps.step2}
          onPress={handleAddFunds}
          variant={ChecklistItemVariant.Glass}
        />

        <Step3Variations variant={ChecklistItemVariant.Glass} />
      </Box>
    </Box>
  );
};

export default OnboardingJourneyScreen;
