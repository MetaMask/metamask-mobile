import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Image, Pressable, ScrollView } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
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
import { useChipScrollList } from './useChipScrollList';

export { calculateChipScrollX } from './calculateChipScrollX';

const DEFAULT_CONTAINER_CLASS = 'pt-3 pb-4';
const DEFAULT_CHIP_CLASS = 'rounded-xl px-4 py-2';

const PredictChipList: React.FC<PredictChipListProps> = ({
  chips,
  activeChipKey,
  onChipSelect,
  testID = PREDICT_CHIP_LIST_TEST_IDS.CONTAINER,
  containerTwClassName = DEFAULT_CONTAINER_CLASS,
  chipTwClassName = DEFAULT_CHIP_CLASS,
  getChipTestId = getPredictChipTestId,
}) => {
  const tw = useTailwind();
  const {
    scrollViewRef,
    handleScrollViewLayout,
    handleChipLayout,
    scrollToChipAtIndex,
  } = useChipScrollList(chips.length);
  const activeChipIndex = useMemo(
    () => chips.findIndex((chip) => chip.key === activeChipKey),
    [chips, activeChipKey],
  );
  const isFirstRenderRef = useRef(true);
  const skipNextSyncScrollIndexRef = useRef<number | null>(null);

  const handlePress = useCallback(
    (key: string, index: number) => {
      skipNextSyncScrollIndexRef.current = index;
      onChipSelect(key);
      scrollToChipAtIndex(index, true);
    },
    [onChipSelect, scrollToChipAtIndex],
  );

  useEffect(() => {
    if (activeChipIndex < 0) {
      return;
    }

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      scrollToChipAtIndex(activeChipIndex, false);
      return;
    }

    if (skipNextSyncScrollIndexRef.current === activeChipIndex) {
      skipNextSyncScrollIndexRef.current = null;
      return;
    }

    scrollToChipAtIndex(activeChipIndex, false);
  }, [activeChipIndex, scrollToChipAtIndex]);

  if (chips.length === 0) {
    return null;
  }

  const chipItems = chips.map((chip, index) => {
    const isActive = chip.key === activeChipKey;
    return (
      <Pressable
        key={chip.key}
        onPress={() => handlePress(chip.key, index)}
        onLayout={(event) => handleChipLayout(index, event)}
        style={tw.style(
          chipTwClassName,
          isActive ? 'bg-icon-default' : 'bg-muted',
        )}
        testID={getChipTestId(chip.key)}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={chip.imageSource ? 2 : undefined}
        >
          {chip.imageSource ? (
            <Image
              source={chip.imageSource}
              style={tw.style('size-4 rounded')}
            />
          ) : null}
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={isActive ? TextColor.InfoInverse : TextColor.TextAlternative}
            testID={getPredictChipLabelTestId(chip.key)}
          >
            {chip.label}
          </Text>
        </Box>
      </Pressable>
    );
  });

  const scrollViewProps = {
    horizontal: true as const,
    showsHorizontalScrollIndicator: false,
    contentContainerStyle: tw.style('px-4 gap-2'),
    onLayout: handleScrollViewLayout,
  };

  return (
    <Box testID={testID} twClassName={containerTwClassName}>
      <ScrollView ref={scrollViewRef} {...scrollViewProps}>
        {chipItems}
      </ScrollView>
    </Box>
  );
};

export default memo(PredictChipList);
