import React, { useState, useEffect } from 'react';
import { Animated, Easing, Pressable } from 'react-native';
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
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';

interface OnboardingCardProps {
  label: string;
  desc: string;
  color: string;
  icon: IconName;
  isCompleted: boolean;
  onAccept: () => void;
  onSkip: () => void;
  index: number;
  total: number;
}

const OnboardingCard = ({
  label,
  desc,
  color,
  icon,
  isCompleted,
  onAccept,
  onSkip,
  index,
  total,
}: OnboardingCardProps) => {
  const tw = useTailwind();
  const [showCelebration, setShowCelebration] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isCompleted && !showCelebration) {
      setShowCelebration(true);
    }
  }, [isCompleted]);

  return (
    <Box twClassName="flex-1 w-full px-6 py-4">
      <Box twClassName="mb-6 flex-row justify-between items-end">
        <Box>
          <Text variant={TextVariant.HeadingLG} twClassName="font-black">For You.</Text>
          <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>Swipe through your setup cards.</Text>
        </Box>
        <Box twClassName="items-end">
          <Text variant={TextVariant.BodyXS} twClassName="font-black opacity-40 uppercase tracking-widest">Deck</Text>
          <Text variant={TextVariant.BodySM} twClassName="font-bold">{index + 1} / {total}</Text>
        </Box>
      </Box>

      <Box twClassName="flex-1 relative items-center justify-center">
        {/* Background Cards Stack Effect */}
        <Box 
          twClassName="absolute w-full h-5/6 bg-background-alternative rounded-3xl border border-border-muted"
          style={{ transform: [{ translateY: 24 }, { scale: 0.9 }], opacity: 0.4 }}
        />
        <Box 
          twClassName="absolute w-full h-5/6 bg-background-alternative rounded-3xl border border-border-muted"
          style={{ transform: [{ translateY: 12 }, { scale: 0.95 }] }}
        />
        
        {/* Main Card */}
        <Box 
          twClassName={`relative w-full h-5/6 rounded-3xl p-8 shadow-xl flex-col`}
          style={tw.style(
            isCompleted ? 'bg-success-default' : color,
          )}
        >
          <Box twClassName="flex-1">
            <Box twClassName="bg-white bg-opacity-20 w-16 h-16 rounded-2xl items-center justify-center mb-6">
              <Icon name={icon} size={IconSize.Xl} color={IconColor.Inverse} />
            </Box>
            <Text variant={TextVariant.HeadingLG} color={TextColor.Inverse} twClassName="font-black mb-2 leading-tight">
              {label}
            </Text>
            <Text variant={TextVariant.BodyMD} color={TextColor.Inverse} twClassName="opacity-80 leading-relaxed">
              {desc}
            </Text>
          </Box>
          
          <Box twClassName="gap-3">
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              label={isCompleted ? 'COMPLETED' : 'ACCEPT & SETUP'}
              onPress={onAccept}
              width={ButtonWidthTypes.Full}
              style={tw.style('bg-white')}
              // Custom style for text color since MMDS Button might not support white bg with dark text directly
              // Prototype shortcut: assume standard primary button text is fine or tweak if needed
            />
            
            <Pressable 
              onPress={onSkip}
              style={tw.style('w-full bg-white bg-opacity-10 py-4 rounded-xl items-center justify-center flex-row border border-white border-opacity-20')}
            >
              <Text color={TextColor.Inverse} twClassName="font-bold mr-2">SKIP CARD</Text>
              <Icon name={IconName.ArrowRight} size={IconSize.Sm} color={IconColor.Inverse} />
            </Pressable>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// Internal helper to avoid component name conflict
import { useRef } from 'react';
export default OnboardingCard;
