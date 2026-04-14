import React, { useCallback, useEffect } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
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
  testID?: string;
}

const ITEM_WIDTH = 56;
const FADE_WIDTH = 24;
const ANIMATION_DURATION = 250;

const PredictSportLineSelector: React.FC<PredictSportLineSelectorProps> = ({
  lines,
  selectedLine,
  onSelectLine,
  testID,
}) => {
  const tw = useTailwind();
  const translateX = useSharedValue(0);
  const containerWidth = useSharedValue(0);

  const selectedIndex = lines.indexOf(selectedLine);
  const isFirstSelected = selectedIndex === 0;
  const isLastSelected = selectedIndex === lines.length - 1;

  const baseTestID = testID || PREDICT_SPORT_LINE_SELECTOR_TEST_IDS.CONTAINER;

  const computeTranslateX = useCallback(
    (index: number, cWidth: number) => {
      if (cWidth === 0) return 0;

      const allItemsWidth = lines.length * ITEM_WIDTH;
      const selectedItemCenter = index * ITEM_WIDTH + ITEM_WIDTH / 2;
      const containerCenter = cWidth / 2;
      const target = containerCenter - selectedItemCenter;

      const minTranslate = -(allItemsWidth - cWidth);
      return Math.max(minTranslate, Math.min(0, target));
    },
    [lines.length],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      containerWidth.value = width;
      translateX.value = computeTranslateX(selectedIndex, width);
    },
    [containerWidth, translateX, selectedIndex, computeTranslateX],
  );

  useEffect(() => {
    if (containerWidth.value === 0) return;

    translateX.value = withTiming(
      computeTranslateX(selectedIndex, containerWidth.value),
      { duration: ANIMATION_DURATION, easing: Easing.inOut(Easing.ease) },
    );
  }, [selectedIndex, computeTranslateX, containerWidth, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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

  const fadeMask = (
    <View style={tw.style('flex-1 flex-row')}>
      <LinearGradient
        colors={['transparent', 'black']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={tw.style(`w-[${FADE_WIDTH}px]`)}
      />
      <View style={tw.style('flex-1 bg-black')} />
      <LinearGradient
        colors={['black', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={tw.style(`w-[${FADE_WIDTH}px]`)}
      />
    </View>
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      testID={baseTestID}
    >
      <Pressable
        onPress={handlePrevious}
        disabled={isFirstSelected}
        testID={`${baseTestID}-${PREDICT_SPORT_LINE_SELECTOR_TEST_IDS.ARROW_LEFT}`}
        style={({ pressed }) =>
          tw.style(
            'p-2',
            pressed && 'opacity-70',
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

      <MaskedView style={tw.style('flex-1')} maskElement={fadeMask}>
        <Box onLayout={handleLayout}>
          <Animated.View style={animatedStyle}>
            {lines.map((line) => {
              const isSelected = line === selectedLine;
              return (
                <Pressable
                  key={line}
                  onPress={() => onSelectLine(line)}
                  testID={`${baseTestID}-${PREDICT_SPORT_LINE_SELECTOR_TEST_IDS.LINE_PREFIX}${line}`}
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
      </MaskedView>

      <Pressable
        onPress={handleNext}
        disabled={isLastSelected}
        testID={`${baseTestID}-${PREDICT_SPORT_LINE_SELECTOR_TEST_IDS.ARROW_RIGHT}`}
        style={({ pressed }) =>
          tw.style(
            'p-2',
            pressed && 'opacity-70',
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
