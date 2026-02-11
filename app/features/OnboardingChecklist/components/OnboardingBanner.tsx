import React, { useRef } from 'react';
import { Pressable, Animated, Easing } from 'react-native';
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
import ChecklistItem, { ChecklistItemVariant } from './ChecklistItem';
import Step3Variations from './Step3Variations';
import SegmentedProgressBar from './SegmentedProgressBar';
import TimelineProgressBar from './TimelineProgressBar';
import { useOnboardingChecklist, DESIGN_STYLE } from '../hooks/useOnboardingChecklist';
import Routes from '../../../constants/navigation/Routes';

interface OnboardingBannerProps {
  onSecureWallet?: () => void;
  style?: any;
}

const OnboardingBanner = ({ style }: OnboardingBannerProps) => {
  const tw = useTailwind();
  const navigation = useNavigation<any>();
  const { steps, reset, completeStep, designStyle } = useOnboardingChecklist();
  const spinValue = useRef(new Animated.Value(0)).current;

  const handleReset = () => {
    spinValue.setValue(0);
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 500,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    reset();
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleAddFunds = () => {
    completeStep('step2');
    navigation.navigate(Routes.RAMP.BUY);
  };

  const completedCount = Object.values(steps).filter(Boolean).length;

  // Determine next step to pulse
  const isNextStep1 = !steps.step1;
  const isNextStep2 = steps.step1 && !steps.step2;
  const isNextStep3 = steps.step1 && steps.step2 && !steps.step3;

  // Style 2: Sleek Timeline
  if (designStyle === DESIGN_STYLE.INTEGRATED_MINIMALIST) {
    return (
      <Box 
        twClassName="px-6 py-4 mx-4 my-2 rounded-3xl bg-background-default border border-border-muted shadow-xs"
        style={style}
      >
        <Box twClassName="flex-row justify-between items-center mb-6">
          <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
            Setup Journey
          </Text>
          <Text variant={TextVariant.BodyXS} color={TextColor.Primary} twClassName="font-bold">
            {completedCount}/3 DONE
          </Text>
        </Box>
        
        <Box twClassName="flex-row">
          <TimelineProgressBar completedCount={completedCount} totalSteps={3} />
          
          <Box twClassName="flex-1 ml-4" gap={0}>
            <ChecklistItem 
              title="Secure Wallet" 
              isCompleted={steps.step1} 
              onPress={() => navigation.navigate(Routes.FAKE_SRP)} 
              variant={ChecklistItemVariant.Timeline} 
              isPulsing={isNextStep1}
              icon={IconName.SecurityTick}
            />
            <ChecklistItem 
              title="Add Funds" 
              isCompleted={steps.step2} 
              onPress={handleAddFunds} 
              variant={ChecklistItemVariant.Timeline} 
              isPulsing={isNextStep2}
              icon={IconName.Add}
            />
            <Step3Variations 
              variant={ChecklistItemVariant.Timeline} 
              isPulsing={isNextStep3} 
              icon={IconName.Card}
            />
          </Box>
        </Box>
      </Box>
    );
  }

  // Style 3: Glassmorphism / Elevation
  if (designStyle === DESIGN_STYLE.GLASSMORPHISM) {
    return (
      <Box 
        twClassName="p-6 mx-4 my-4 rounded-3xl bg-background-default shadow-lg border border-border-muted"
        style={style}
      >
        <Text variant={TextVariant.HeadingLG} color={TextColor.Default} twClassName="mb-6">
          Ready to start?
        </Text>
        <ChecklistItem title="Protect your account" isCompleted={steps.step1} onPress={() => navigation.navigate(Routes.FAKE_SRP)} variant={ChecklistItemVariant.Glass} isPulsing={isNextStep1} icon={IconName.SecurityTick} />
        <ChecklistItem title="Get some ETH" isCompleted={steps.step2} onPress={handleAddFunds} variant={ChecklistItemVariant.Glass} isPulsing={isNextStep2} icon={IconName.Add} />
        <Step3Variations variant={ChecklistItemVariant.Glass} isPulsing={isNextStep3} icon={IconName.Card} />
      </Box>
    );
  }

  // Style 1: Modern Fintech (Default)
  return (
    <Box 
      twClassName="p-4 mx-4 my-2 rounded-xl bg-background-default border border-border-muted shadow-sm"
      style={style}
    >
      <Box twClassName="flex-row justify-between items-center mb-2">
        <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
          Complete your setup
        </Text>
        <Pressable onPress={handleReset} hitSlop={10}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Icon
              name={IconName.Refresh}
              size={IconSize.Sm}
              color={IconColor.Muted}
            />
          </Animated.View>
        </Pressable>
      </Box>
      
      <SegmentedProgressBar currentStep={completedCount} totalSteps={3} />
      
      <ChecklistItem
        title="Secure your wallet"
        isCompleted={steps.step1}
        onPress={() => navigation.navigate(Routes.FAKE_SRP)}
        variant={ChecklistItemVariant.Card}
        isPulsing={isNextStep1}
      />
      
      <ChecklistItem
        title="Add funds"
        isCompleted={steps.step2}
        onPress={handleAddFunds}
        variant={ChecklistItemVariant.Card}
        isPulsing={isNextStep2}
      />
      
      <Step3Variations variant={ChecklistItemVariant.Card} isPulsing={isNextStep3} />
    </Box>
  );
};

export default OnboardingBanner;
