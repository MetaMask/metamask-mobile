import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Image, Pressable, ScrollView } from 'react-native';
import { ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
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
  useGestureHandlerScrollView = false,
}) => {
  const tw = useTailwind();
  const activeChipIndex = useMemo(
    () => chips.findIndex((chip) => chip.key === activeChipKey),
    [activeChipKey, chips],
  );
  const {
    scrollViewRef,
    handleScrollViewLayout,
    handleChipLayout,
    scrollToChipAtIndex,
  } = useChipScrollList(chips.length);
  const pendingUserSelectedChipKeyRef = useRef<string | null>(null);

  const handlePress = useCallback(
    (key: string, index: number) => {
      pendingUserSelectedChipKeyRef.current =
        key === activeChipKey ? null : key;
      onChipSelect(key);
      scrollToChipAtIndex(index, true);
    },
    [activeChipKey, onChipSelect, scrollToChipAtIndex],
  );

  const syncActiveChipScroll = useCallback(
    (animated = false) => {
      if (activeChipIndex === -1) {
        return;
      }

      scrollToChipAtIndex(activeChipIndex, animated);
    },
    [activeChipIndex, scrollToChipAtIndex],
  );

  const handleContainerLayout = useCallback(
    (event: Parameters<typeof handleScrollViewLayout>[0]) => {
      handleScrollViewLayout(event);
      if (pendingUserSelectedChipKeyRef.current) {
        return;
      }
      syncActiveChipScroll(false);
    },
    [handleScrollViewLayout, syncActiveChipScroll],
  );

  const handleChipItemLayout = useCallback(
    (index: number, event: Parameters<typeof handleChipLayout>[1]) => {
      handleChipLayout(index, event);
      if (pendingUserSelectedChipKeyRef.current) {
        return;
      }
      syncActiveChipScroll(false);
    },
    [handleChipLayout, syncActiveChipScroll],
  );

  useEffect(() => {
    const shouldAnimate =
      pendingUserSelectedChipKeyRef.current === activeChipKey;
    syncActiveChipScroll(shouldAnimate);
    if (shouldAnimate) {
      pendingUserSelectedChipKeyRef.current = null;
    }
  }, [activeChipKey, syncActiveChipScroll]);

  if (chips.length === 0) {
    return null;
  }

  const chipItems = chips.map((chip, index) => {
    const isActive = chip.key === activeChipKey;
    return (
      <Pressable
        key={chip.key}
        onPress={() => handlePress(chip.key, index)}
        onLayout={(event) => handleChipItemLayout(index, event)}
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
    onLayout: handleContainerLayout,
  };

  return (
    <Box testID={testID} twClassName={containerTwClassName}>
      {useGestureHandlerScrollView ? (
        <GestureHandlerScrollView
          ref={scrollViewRef}
          {...scrollViewProps}
          keyboardShouldPersistTaps="handled"
        >
          {chipItems}
        </GestureHandlerScrollView>
      ) : (
        <ScrollView ref={scrollViewRef} {...scrollViewProps}>
          {chipItems}
        </ScrollView>
      )}
    </Box>
  );
};

export default memo(PredictChipList);
