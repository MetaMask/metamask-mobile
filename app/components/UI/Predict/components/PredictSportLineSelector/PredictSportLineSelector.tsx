import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PREDICT_SPORT_LINE_SELECTOR_TEST_IDS } from './PredictSportLineSelector.testIds';

interface PredictSportLineSelectorProps {
  lines: number[];
  selectedLine: number;
  onSelectLine: (line: number) => void;
  visibleCount?: number; // default: lines.length (show all)
  testID?: string;
}

const ITEM_WIDTH = 48;

const PredictSportLineSelector: React.FC<PredictSportLineSelectorProps> = ({
  lines,
  selectedLine,
  onSelectLine,
  visibleCount,
  testID,
}) => {
  const tw = useTailwind();
  const translateX = useSharedValue(0);

  const selectedIndex = lines.indexOf(selectedLine);
  const isFirstSelected = selectedIndex === 0;
  const isLastSelected = selectedIndex === lines.length - 1;

  const showAll = visibleCount === undefined || visibleCount >= lines.length;
  const containerWidth =
    showAll || visibleCount === undefined
      ? undefined
      : visibleCount * ITEM_WIDTH;

  useEffect(() => {
    if (!showAll && visibleCount !== undefined) {
      const halfVisible = Math.floor(visibleCount / 2);
      const maxStartIndex = lines.length - visibleCount;
      const windowStartIndex = Math.max(
        0,
        Math.min(selectedIndex - halfVisible, maxStartIndex),
      );

      translateX.value = withTiming(-(windowStartIndex * ITEM_WIDTH), {
        duration: 250,
        easing: Easing.inOut(Easing.ease),
      });
    } else {
      translateX.value = 0;
    }
  }, [selectedIndex, showAll, visibleCount, lines.length, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
      flexDirection: 'row',
      alignItems: 'center',
    }));

  const handlePrevious = () => {
    if (!isFirstSelected) {
      onSelectLine(lines[selectedIndex - 1]);
    }
  };

  const handleNext = () => {
    if (!isLastSelected) {
      onSelectLine(lines[selectedIndex + 1]);
    }
  };

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="gap-2"
      testID={testID || PREDICT_SPORT_LINE_SELECTOR_TEST_IDS.CONTAINER}
    >
      <Pressable
        onPress={handlePrevious}
        disabled={isFirstSelected}
        testID={`${testID || PREDICT_SPORT_LINE_SELECTOR_TEST_IDS.CONTAINER}-${PREDICT_SPORT_LINE_SELECTOR_TEST_IDS.ARROW_LEFT}`}
        style={({ pressed }) =>
          tw.style(
            'p-2 rounded-full',
            pressed && 'bg-pressed',
            isFirstSelected && 'opacity-30',
          )
        }
      >
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Sm}
          color={isFirstSelected ? IconColor.IconMuted : IconColor.IconDefault}
        />
      </Pressable>

      <Box
        twClassName="overflow-hidden"
        style={containerWidth ? { width: containerWidth } : undefined}
      >
        <Animated.View style={animatedStyle}>
          {lines.map((line) => {
            const isSelected = line === selectedLine;
            return (
              <Pressable
                key={line}
                onPress={() => onSelectLine(line)}
                testID={`${testID || PREDICT_SPORT_LINE_SELECTOR_TEST_IDS.CONTAINER}-${PREDICT_SPORT_LINE_SELECTOR_TEST_IDS.LINE_PREFIX}${line}`}
                style={({ pressed }) =>
                  tw.style(
                    'items-center justify-center py-2',
                    pressed && 'opacity-70',
                    { width: ITEM_WIDTH },
                  )
                }
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={
                    isSelected
                      ? TextColor.TextDefault
                      : TextColor.TextAlternative
                  }
                  twClassName={isSelected ? 'font-bold' : ''}
                >
                  {line}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
      </Box>

      <Pressable
        onPress={handleNext}
        disabled={isLastSelected}
        testID={`${testID || PREDICT_SPORT_LINE_SELECTOR_TEST_IDS.CONTAINER}-${PREDICT_SPORT_LINE_SELECTOR_TEST_IDS.ARROW_RIGHT}`}
        style={({ pressed }) =>
          tw.style(
            'p-2 rounded-full',
            pressed && 'bg-pressed',
            isLastSelected && 'opacity-30',
          )
        }
      >
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={isLastSelected ? IconColor.IconMuted : IconColor.IconDefault}
        />
      </Pressable>
    </Box>
  );
};

export default PredictSportLineSelector;
