import React from 'react';
import {
  Pressable,
  Image as RNImage,
  Animated,
  Dimensions,
} from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconColor as MMDSIconColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { StackCardProps } from './StackCard.types';

const BANNER_HEIGHT = 100;
const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_WIDTH - 32;

export const StackCard: React.FC<StackCardProps> = ({
  slide,
  isCurrentCard,
  currentCardOpacity,
  currentCardScale,
  currentCardTranslateY,
  nextCardOpacity,
  nextCardScale,
  nextCardTranslateY,
  nextCardBgOpacity,
  onSlideClick,
  onTransitionToNextCard,
  onTransitionToEmpty,
}) => {
  const tw = useTailwind();
  const isEmptyCard = slide.variableName === 'empty';

  // Auto-dismiss empty card after 1000ms when it becomes current
  React.useEffect(() => {
    if (isCurrentCard && isEmptyCard) {
      const timer = setTimeout(() => {
        onTransitionToEmpty?.();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isCurrentCard, isEmptyCard, onTransitionToEmpty]);

  return (
    <Animated.View
      key={slide.id}
      style={tw.style('absolute', {
        opacity: isCurrentCard ? currentCardOpacity : nextCardOpacity,
        transform: [
          {
            scale: isCurrentCard ? currentCardScale : nextCardScale,
          },
          {
            translateY: isCurrentCard
              ? currentCardTranslateY
              : nextCardTranslateY,
          },
        ],
        zIndex: isCurrentCard ? 3 : 2, // Current card on top, next card in middle
      })}
    >
      <Box
        style={tw.style(
          'rounded-xl relative overflow-hidden border border-muted',
          {
            height: BANNER_HEIGHT,
            width: BANNER_WIDTH,
          },
        )}
      >
        <Pressable
          testID={`carousel-slide-${slide.id}`}
          style={({ pressed }) =>
            tw.style(
              'bg-default rounded-xl pl-4 pr-3',
              {
                height: BANNER_HEIGHT,
                width: BANNER_WIDTH,
              },
              pressed && 'bg-default-pressed',
            )
          }
          onPress={() => onSlideClick(slide.id, slide.navigation)}
        >
          {/* Animated pressed background overlay for next card */}
          {!isCurrentCard && (
            <Animated.View
              style={tw.style(
                'absolute inset-0 bg-default-pressed rounded-xl',
                {
                  opacity: nextCardBgOpacity,
                },
              )}
            />
          )}
          {isEmptyCard ? (
            // Empty card layout - centered text only
            <Box twClassName="w-full h-full flex justify-center items-center">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                testID={`carousel-slide-${slide.id}-title`}
              >
                {slide.title}
              </Text>
            </Box>
          ) : (
            // Regular card layout - image + text + close button
            <Box twClassName="w-full h-full flex-row gap-4 items-center">
              <Box
                style={tw.style(
                  'overflow-hidden justify-center items-center self-center rounded-xl',
                  {
                    width: 72,
                    height: 72,
                  },
                )}
              >
                <RNImage
                  source={
                    slide.image ? { uri: slide.image } : { uri: undefined }
                  }
                  style={tw.style({ width: 72, height: 72 })}
                  resizeMode="contain"
                />
              </Box>
              <Box twClassName="flex-1 h-[72px] justify-start">
                <Box twClassName="flex-row items-center justify-between h-6 overflow-visible">
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    testID={`carousel-slide-${slide.id}-title`}
                    numberOfLines={1}
                    twClassName="flex-1"
                  >
                    {slide.title}
                  </Text>
                  <ButtonIcon
                    iconName={IconName.Close}
                    size={ButtonIconSize.Md}
                    iconProps={{ color: MMDSIconColor.IconDefault }}
                    onPress={() => onTransitionToNextCard?.()}
                    testID={`carousel-slide-${slide.id}-close-button`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  />
                </Box>
                <Box twClassName="mt-1">
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                    numberOfLines={2}
                  >
                    {slide.description}
                  </Text>
                </Box>
              </Box>
            </Box>
          )}
        </Pressable>
      </Box>
    </Animated.View>
  );
};

export default StackCard;
