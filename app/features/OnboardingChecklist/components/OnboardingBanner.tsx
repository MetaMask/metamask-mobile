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
import ChecklistItem from './ChecklistItem';
import Step3Variations from './Step3Variations';
import { useOnboardingChecklist } from '../hooks/useOnboardingChecklist';
import Routes from '../../../constants/navigation/Routes';

interface OnboardingBannerProps {
  onSecureWallet: () => void;
}

const OnboardingBanner = ({ onSecureWallet }: OnboardingBannerProps) => {
  const tw = useTailwind();
  const navigation = useNavigation<any>();
  const { steps, reset, completeStep } = useOnboardingChecklist();
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

  return (
    <Box twClassName="p-4 mx-4 my-2 rounded-xl bg-background-default border border-border-muted shadow-sm">
      <Box twClassName="flex-row justify-between items-center mb-4">
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
      
      <ChecklistItem
        title="Secure your wallet"
        isCompleted={steps.step1}
        onPress={onSecureWallet}
      />
      
      <ChecklistItem
        title="Add funds"
        isCompleted={steps.step2}
        onPress={handleAddFunds}
      />
      
      <Step3Variations />
    </Box>
  );
};

export default OnboardingBanner;
