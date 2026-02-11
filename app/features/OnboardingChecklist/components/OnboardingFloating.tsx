import React, { useRef } from 'react';
import { Animated, Pressable, Easing } from 'react-native';
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

interface OnboardingFloatingProps {
  onSecureWallet: () => void;
}

const OnboardingFloating = ({ onSecureWallet }: OnboardingFloatingProps) => {
  const tw = useTailwind();
  const navigation = useNavigation<any>();
  const { steps, reset, completeStep } = useOnboardingChecklist();
  const [isExpandedLocal, setIsExpandedLocal] = React.useState(false);
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
    <Box
      style={tw.style(
        'absolute bottom-8 left-4 right-4 z-50 bg-background-default rounded-2xl shadow-lg border border-border-muted overflow-hidden',
      )}
    >
      <Box twClassName="flex-row items-center pr-4">
        <Pressable onPress={() => setIsExpandedLocal(!isExpandedLocal)} style={tw.style('flex-1')}>
          <Box twClassName="flex-row items-center p-4">
            <Box twClassName="w-8 h-8 rounded-full bg-primary-muted items-center justify-center mr-3">
              <Icon
                name={IconName.MetamaskFoxOutline}
                size={IconSize.Sm}
                color={IconColor.Primary}
              />
            </Box>
            <Box twClassName="flex-1">
              <Text variant={TextVariant.BodySM} color={TextColor.Default}>
                Complete your setup
              </Text>
              <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
                {Object.values(steps).filter(Boolean).length} of 3 steps done
              </Text>
            </Box>
            <Icon
              name={isExpandedLocal ? IconName.ArrowDown : IconName.ArrowUp}
              size={IconSize.Sm}
              color={IconColor.Muted}
            />
          </Box>
        </Pressable>
        {isExpandedLocal && (
          <Pressable onPress={handleReset} hitSlop={10}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Icon
                name={IconName.Refresh}
                size={IconSize.Sm}
                color={IconColor.Muted}
              />
            </Animated.View>
          </Pressable>
        )}
      </Box>

      {isExpandedLocal && (
        <Box twClassName="px-4 pb-4">
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
      )}
    </Box>
  );
};

export default OnboardingFloating;
