import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Easing } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { useOnboardingChecklist } from '../hooks/useOnboardingChecklist';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

interface OnboardingMiniBarProps {
  scrollAnim: Animated.Value;
}

const OnboardingMiniBar = ({ scrollAnim }: OnboardingMiniBarProps) => {
  const tw = useTailwind();
  const navigation = useNavigation<any>();
  const { steps } = useOnboardingChecklist();
  
  const completedCount = Object.values(steps).filter(Boolean).length;
  
  const onPress = () => navigation.navigate(Routes.ONBOARDING_JOURNEY);
  
  // Animation for hiding/showing based on scroll
  const translateY = scrollAnim.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 150],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        tw.style(
          'absolute bottom-2 left-4 right-4 z-40 bg-background-default rounded-full shadow-lg border border-border-muted overflow-hidden'
        ),
        { transform: [{ translateY }] }
      ]}
    >
      <Pressable onPress={onPress}>
        <Box twClassName="flex-row items-center px-4 py-3">
          <Box twClassName="mr-3">
            <Icon
              name={IconName.MetamaskFoxOutline}
              size={IconSize.Sm}
              color={IconColor.Primary}
            />
          </Box>
          
          <Box twClassName="flex-1 mr-4">
            <Text variant={TextVariant.BodyXS} color={TextColor.Default} twClassName="mb-1 font-bold">
              {completedCount} of 3 completed
            </Text>
            {/* Segmented Line Bar */}
            <Box twClassName="flex-row gap-1 h-1.5 w-full">
              {[1, 2, 3].map((i) => (
                <Box
                  key={i}
                  style={tw.style(
                    'flex-1 rounded-full',
                    i <= completedCount ? 'bg-success-default' : 'bg-background-alternative'
                  )}
                />
              ))}
            </Box>
          </Box>

          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.Muted}
          />
        </Box>
      </Pressable>
    </Animated.View>
  );
};

export default OnboardingMiniBar;
