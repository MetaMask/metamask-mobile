import React, { useEffect, useRef } from 'react';
import { Pressable, Animated, Easing } from 'react-native';
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

export enum ChecklistItemVariant {
  Default = 'default',
  Card = 'card',
  Minimal = 'minimal',
  Glass = 'glass',
  Timeline = 'timeline',
}

interface ChecklistItemProps {
  title: string;
  isCompleted: boolean;
  onPress?: () => void;
  isLoading?: boolean;
  variant?: ChecklistItemVariant;
  isPulsing?: boolean;
  icon?: IconName;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  title,
  isCompleted,
  onPress,
  isLoading,
  variant = ChecklistItemVariant.Default,
  isPulsing = false,
  icon,
}) => {
  const tw = useTailwind();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPulsing && !isCompleted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPulsing, isCompleted, pulseAnim]);

  const isCard = variant === ChecklistItemVariant.Card;
  const isMinimal = variant === ChecklistItemVariant.Minimal;
  const isGlass = variant === ChecklistItemVariant.Glass;
  const isTimeline = variant === ChecklistItemVariant.Timeline;

  const renderPoints = () => (
    <Box twClassName="flex-row items-center bg-success-muted px-2 py-1 rounded-full ml-2">
      <Text variant={TextVariant.BodyXS} color={TextColor.Success} twClassName="font-bold mr-1">
        +1000
      </Text>
      <Icon name={IconName.MetamaskFoxOutline} size={IconSize.Xss} color={IconColor.Success} />
    </Box>
  );

  if (isTimeline) {
    return (
      <Pressable onPress={onPress} disabled={isCompleted || isLoading}>
        <Box 
          twClassName="flex-row items-center h-20 px-2"
          style={tw.style(isCompleted && 'opacity-50')}
        >
          {icon && (
            <Box twClassName="mr-4 w-12 h-12 rounded-full bg-background-alternative items-center justify-center">
              <Icon 
                name={icon} 
                size={IconSize.Lg} 
                color={isPulsing ? IconColor.Primary : IconColor.Default} 
              />
            </Box>
          )}
          <Box twClassName="flex-1">
            <Box twClassName="flex-row items-center">
              <Text
                variant={TextVariant.BodyLG}
                color={isPulsing ? TextColor.Primary : TextColor.Default}
                twClassName="font-bold"
              >
                {title}
              </Text>
              {!isCompleted && renderPoints()}
            </Box>
            <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
              {isCompleted ? 'Completed' : 'Tap to start'}
            </Text>
          </Box>
          {!isCompleted && (
            <Icon name={IconName.ArrowRight} size={IconSize.Sm} color={IconColor.Muted} />
          )}
        </Box>
      </Pressable>
    );
  }

  if (isGlass) {
    return (
      <Pressable onPress={onPress} disabled={isCompleted || isLoading}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Box
            twClassName="flex-row items-center p-5 mb-3 rounded-2xl bg-background-default"
            style={tw.style(
              'border border-border-muted shadow-sm',
              isCompleted && 'opacity-80',
              isPulsing && 'border-primary-default'
            )}
          >
            <Box twClassName="mr-4">
              {isCompleted ? (
                <Box twClassName="w-10 h-10 rounded-full bg-success-muted items-center justify-center">
                  <Icon
                    name={IconName.Check}
                    size={IconSize.Md}
                    color={IconColor.Success}
                  />
                </Box>
              ) : (
                <Box twClassName="w-10 h-10 rounded-full border-2 border-border-muted items-center justify-center">
                  <Box twClassName="w-2 h-2 rounded-full bg-border-muted" />
                </Box>
              )}
            </Box>
            <Box twClassName="flex-1 flex-row items-center">
              <Text
                variant={TextVariant.BodyLG}
                color={TextColor.Default}
              >
                {title}
              </Text>
              {!isCompleted && renderPoints()}
            </Box>
          </Box>
        </Animated.View>
      </Pressable>
    );
  }

  if (isMinimal) {
    return (
      <Pressable onPress={onPress} disabled={isCompleted || isLoading}>
        <Box
          twClassName="flex-row items-center py-3 border-b border-border-muted"
          style={tw.style(isCompleted && 'opacity-50', isPulsing && 'bg-primary-muted')}
        >
          <Box twClassName="mr-3">
            {isCompleted ? (
              <Icon
                name={IconName.Check}
                size={IconSize.Sm}
                color={IconColor.Success}
              />
            ) : (
              <Box twClassName="w-4 h-4 rounded-full border border-icon-muted" />
            )}
          </Box>
          <Box twClassName="flex-1 flex-row items-center">
            <Text
              variant={TextVariant.BodySM}
              color={isPulsing ? TextColor.Primary : TextColor.Default}
            >
              {title}
            </Text>
            {!isCompleted && renderPoints()}
          </Box>
        </Box>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={isCompleted || isLoading}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Box
          twClassName={isCard ? 'flex-row items-center p-4 mb-2 rounded-lg bg-background-default' : 'flex-row items-center p-4 mb-2 rounded-lg bg-background-alternative'}
          style={tw.style(
            isCard ? 'border border-border-muted shadow-xs' : 'border border-border-default',
            isCompleted && 'opacity-60',
            isPulsing && 'border-primary-default'
          )}
        >
          <Box twClassName="mr-3">
            {isCompleted ? (
              <Icon
                name={IconName.Check}
                size={IconSize.Md}
                color={IconColor.Success}
              />
            ) : (
              <Box
                twClassName="w-5 h-5 rounded-full border-2 border-icon-muted"
                style={tw.style(isLoading || isPulsing ? 'border-primary-default' : '')}
              />
            )}
          </Box>
          <Box twClassName="flex-1 flex-row items-center">
            <Text
              variant={TextVariant.BodyMD}
              color={isPulsing ? TextColor.Primary : isCompleted ? TextColor.Alternative : TextColor.Default}
            >
              {title}
            </Text>
            {!isCompleted && renderPoints()}
          </Box>
          {!isCompleted && !isLoading && (
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Sm}
              color={isPulsing ? IconColor.Primary : IconColor.Muted}
            />
          )}
        </Box>
      </Animated.View>
    </Pressable>
  );
};

export default ChecklistItem;
