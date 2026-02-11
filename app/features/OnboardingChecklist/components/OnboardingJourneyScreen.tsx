import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
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

const OnboardingJourneyScreen = () => {
  const tw = useTailwind();
  const navigation = useNavigation<any>();
  const { steps, completeStep } = useOnboardingChecklist();

  const handleAddFunds = () => {
    completeStep('step2');
    navigation.navigate(Routes.RAMP.BUY);
  };

  const completedCount = Object.values(steps).filter(Boolean).length;

  return (
    <SafeAreaView style={tw.style('flex-1 bg-background-default')}>
      {/* Premium Header */}
      <Box twClassName="flex-row items-center justify-between px-6 py-4">
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={20}>
          <Icon name={IconName.Close} size={IconSize.Md} color={IconColor.Default} />
        </TouchableOpacity>
        <Text variant={TextVariant.HeadingSM}>Your Journey</Text>
        <Box twClassName="w-6" /> {/* Spacer for centering */}
      </Box>

      <ScrollView contentContainerStyle={tw.style('px-6 pt-8 pb-12')}>
        <Box twClassName="mb-10">
          <Text variant={TextVariant.HeadingLG} twClassName="mb-3">
            Welcome to MetaMask
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative} style={tw.style('leading-6')}>
            Let's get you set up for the decentralized web. Complete these three essential steps to unlock the full power of your wallet.
          </Text>
        </Box>

        <Box twClassName="mb-8">
          <Box twClassName="flex-row justify-between items-end mb-4">
            <Text variant={TextVariant.BodySM} color={TextColor.Default} twClassName="font-bold uppercase tracking-wider">
              Setup Progress
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Primary}>
              {completedCount} of 3 done
            </Text>
          </Box>
          {/* Progress Bar Container */}
          <Box twClassName="h-2 w-full bg-background-alternative rounded-full overflow-hidden">
            <Box 
              style={tw.style(
                'h-full bg-success-default rounded-full', 
                { width: `${(completedCount / 3) * 100}%` }
              )} 
            />
          </Box>
        </Box>

        <Box gap={4}>
          <ChecklistItem
            title="Secure your account"
            isCompleted={steps.step1}
            onPress={() => navigation.navigate(Routes.FAKE_SRP)}
            variant={ChecklistItemVariant.Glass}
            isPulsing={!steps.step1}
          />

          <ChecklistItem
            title="Fund your wallet"
            isCompleted={steps.step2}
            onPress={handleAddFunds}
            variant={ChecklistItemVariant.Glass}
            isPulsing={steps.step1 && !steps.step2}
          />

          <Step3Variations 
            variant={ChecklistItemVariant.Glass} 
            isPulsing={steps.step1 && steps.step2 && !steps.step3} 
          />
        </Box>

        {completedCount === 3 && (
          <Box twClassName="mt-10 p-6 bg-success-muted rounded-2xl items-center">
            <Icon name={IconName.Verified} size={IconSize.Xl} color={IconColor.Success} />
            <Text variant={TextVariant.HeadingSM} twClassName="mt-4 mb-2 text-center">
              You're all set!
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative} twClassName="text-center">
              Your wallet is secure and ready for exploration.
            </Text>
          </Box>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default OnboardingJourneyScreen;
