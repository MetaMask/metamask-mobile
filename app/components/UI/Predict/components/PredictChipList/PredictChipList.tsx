import React, { memo, useCallback, useRef } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  PREDICT_CHIP_LIST_TEST_IDS,
  getPredictChipTestId,
  getPredictChipLabelTestId,
} from './PredictChipList.testIds';
import type { PredictChipListProps } from './PredictChipList.types';

/** Must match the `px-4` applied to ScrollView contentContainerStyle. */
const CONTENT_PADDING = 16;

export function calculateChipScrollX(
  chipIndex: number,
  chipsCount: number,
  layouts: ReadonlyMap<number, { x: number; width: number }>,
  viewportWidth: number,
): number | null {
  const selected = layouts.get(chipIndex);
  if (!selected) return null;

  const leftIdx = Math.max(0, chipIndex - 1);
  const rightIdx = Math.min(chipsCount - 1, chipIndex + 1);
  const leftChip = layouts.get(leftIdx);
  const rightChip = layouts.get(rightIdx);
  if (!leftChip || !rightChip) return null;

  const rangeLeft = leftChip.x - CONTENT_PADDING;
  const rangeRight = rightChip.x + rightChip.width + CONTENT_PADDING;
  const rangeWidth = rangeRight - rangeLeft;

  let scrollX: number;
  if (rangeWidth <= viewportWidth) {
    scrollX = rangeLeft - (viewportWidth - rangeWidth) / 2;
  } else {
    scrollX = selected.x + selected.width / 2 - viewportWidth / 2;
  }

  return Math.max(0, scrollX);
}

const PredictChipList: React.FC<PredictChipListProps> = ({
  chips,
  activeChipKey,
  onChipSelect,
  testID = PREDICT_CHIP_LIST_TEST_IDS.CONTAINER,
}) => {
  const tw = useTailwind();
  const scrollViewRef = useRef<ScrollView>(null);
  const chipLayoutsRef = useRef<Map<number, { x: number; width: number }>>(
    new Map(),
  );
  const viewportWidthRef = useRef(0);

  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    viewportWidthRef.current = event.nativeEvent.layout.width;
  }, []);

  const handleChipLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      chipLayoutsRef.current.set(index, { x, width });
    },
    [],
  );

  const scrollToChip = useCallback(
    (chipIndex: number) => {
      const scrollView = scrollViewRef.current;
      const vw = viewportWidthRef.current;
      if (!scrollView || vw === 0) return;

      const scrollX = calculateChipScrollX(
        chipIndex,
        chips.length,
        chipLayoutsRef.current,
        vw,
      );
      if (scrollX === null) return;

      scrollView.scrollTo({ x: scrollX, animated: true });
    },
    [chips.length],
  );

  const handlePress = useCallback(
    (key: string, index: number) => {
      onChipSelect(key);
      scrollToChip(index);
    },
    [onChipSelect, scrollToChip],
  );

  if (chips.length === 0) {
    return null;
  }

  return (
    <Box testID={testID} twClassName="pt-3 pb-4">
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 gap-2')}
        onLayout={handleScrollViewLayout}
      >
        {chips.map((chip, index) => {
          const isActive = chip.key === activeChipKey;
          return (
            <Pressable
              key={chip.key}
              onPress={() => handlePress(chip.key, index)}
              onLayout={(e) => handleChipLayout(index, e)}
              style={tw.style(
                'rounded-xl px-4 py-2',
                isActive ? 'bg-icon-default' : 'bg-muted',
              )}
              testID={getPredictChipTestId(chip.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={
                  isActive ? TextColor.InfoInverse : TextColor.TextAlternative
                }
                testID={getPredictChipLabelTestId(chip.key)}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Box>
  );
};

export default memo(PredictChipList);
