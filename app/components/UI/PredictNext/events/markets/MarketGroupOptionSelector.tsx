import React, { useCallback, useEffect } from 'react';
import {
  Pressable,
  type LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import type { Theme } from '../../../../../util/theme/models';
import type { PredictMarket } from '../../types';
import { MarketGroupCardTestIds } from './MarketGroupCard.testIds';

export interface MarketGroupOptionSelectorProps {
  groupKey: string;
  markets: readonly PredictMarket[];
  selectedMarketId: PredictMarket['id'];
  onSelect: (marketId: PredictMarket['id']) => void;
}

const ITEM_WIDTH = 56;
const FADE_WIDTH = 24;
const SELECTOR_HEIGHT = 42;
const ANIMATION_DURATION = 250;

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    selectionMarker: {
      position: 'absolute',
      bottom: 0,
      left: '50%',
      marginLeft: -6,
      width: 0,
      height: 0,
      borderLeftWidth: 6,
      borderRightWidth: 6,
      borderBottomWidth: 8,
      borderLeftColor: colors.background.section,
      borderRightColor: colors.background.section,
      borderBottomColor: colors.text.default,
    },
  });

const getOptionValue = (market: PredictMarket): number | undefined =>
  market.group?.option?.type === 'number'
    ? market.group.option.value
    : undefined;

export const MarketGroupOptionSelector = ({
  groupKey,
  markets,
  selectedMarketId,
  onSelect,
}: MarketGroupOptionSelectorProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const translateX = useSharedValue(0);
  const containerWidth = useSharedValue(0);
  const selectedIndex = Math.max(
    0,
    markets.findIndex((market) => market.id === selectedMarketId),
  );

  const computeTranslateX = useCallback((index: number, width: number) => {
    if (width === 0) {
      return 0;
    }

    const selectedItemCenter = index * ITEM_WIDTH + ITEM_WIDTH / 2;
    return width / 2 - selectedItemCenter;
  }, []);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      containerWidth.value = width;
      translateX.value = computeTranslateX(selectedIndex, width);
    },
    [computeTranslateX, containerWidth, selectedIndex, translateX],
  );

  useEffect(() => {
    if (containerWidth.value === 0) {
      return;
    }

    translateX.value = withTiming(
      computeTranslateX(selectedIndex, containerWidth.value),
      {
        duration: ANIMATION_DURATION,
        easing: Easing.inOut(Easing.ease),
      },
    );
  }, [computeTranslateX, containerWidth, selectedIndex, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    height: '100%',
    transform: [{ translateX: translateX.value }],
  }));

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
    <Box twClassName={`relative h-[${SELECTOR_HEIGHT}px]`}>
      <MaskedView
        style={tw.style('flex-1 overflow-hidden')}
        maskElement={fadeMask}
      >
        <Box twClassName="h-full" onLayout={handleLayout}>
          <Animated.View style={animatedStyle}>
            {markets.map((market) => {
              const isSelected = market.id === selectedMarketId;
              const optionValue = getOptionValue(market);

              return (
                <Pressable
                  key={market.id}
                  testID={MarketGroupCardTestIds.option(groupKey, market.id)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    optionValue === undefined
                      ? 'Market option'
                      : `Market option ${optionValue}`
                  }
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onSelect(market.id)}
                  style={tw.style('items-center justify-center py-1', {
                    width: ITEM_WIDTH,
                  })}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={
                      isSelected ? FontWeight.Bold : FontWeight.Medium
                    }
                    color={
                      isSelected
                        ? TextColor.TextDefault
                        : TextColor.TextAlternative
                    }
                  >
                    {optionValue ?? '—'}
                  </Text>
                </Pressable>
              );
            })}
          </Animated.View>
        </Box>
      </MaskedView>
      <Box
        testID={MarketGroupCardTestIds.selectionMarker(groupKey)}
        pointerEvents="none"
        style={styles.selectionMarker}
      />
    </Box>
  );
};
