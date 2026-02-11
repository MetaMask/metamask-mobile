import React, { useState } from 'react';
import { Animated, Pressable } from 'react-native';
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

const OnboardingFloating = () => {
  const tw = useTailwind();
  const navigation = useNavigation<any>();
  const { steps } = useOnboardingChecklist();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Box
      style={tw.style(
        'absolute bottom-8 left-4 right-4 z-50 bg-background-default rounded-2xl shadow-lg border border-border-muted overflow-hidden',
      )}
    >
      <Pressable onPress={() => setIsExpanded(!isExpanded)}>
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
            name={isExpanded ? IconName.ArrowDown : IconName.ArrowUp}
            size={IconSize.Sm}
            color={IconColor.Muted}
          />
        </Box>
      </Pressable>

      {isExpanded && (
        <Box twClassName="px-4 pb-4">
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
      )}
    </Box>
  );
};

export default OnboardingFloating;
