import React, { useCallback, useEffect } from 'react';
import {
  Pressable,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
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
    ? market.group.marketType === 'spread'
      ? Math.abs(market.group.option.value)
      : market.group.option.value
    : undefined;

const getIndexForScrollOffset = (offset: number, itemCount: number): number => {
  if (itemCount === 0) {
    return 0;
  }

  const index = Math.round(offset / ITEM_WIDTH);
  return Math.max(0, Math.min(itemCount - 1, index));
};

export const MarketGroupOptionSelector = ({
  groupKey,
  markets,
  selectedMarketId,
  onSelect,
}: MarketGroupOptionSelectorProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const hasInitializedScroll = React.useRef(false);
  const lastScrolledIndex = React.useRef<number | null>(null);
  const selectedIndex = Math.max(
    0,
    markets.findIndex((market) => market.id === selectedMarketId),
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    lastScrolledIndex.current = null;
    setContainerWidth(width);
  }, []);

  const scrollToIndex = useCallback((index: number, animated: boolean) => {
    lastScrolledIndex.current = index;
    scrollViewRef.current?.scrollTo({
      x: index * ITEM_WIDTH,
      animated,
    });
  }, []);

  useEffect(() => {
    if (containerWidth === 0 || lastScrolledIndex.current === selectedIndex) {
      return;
    }

    scrollToIndex(selectedIndex, hasInitializedScroll.current);
    hasInitializedScroll.current = true;
  }, [containerWidth, scrollToIndex, selectedIndex]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset =
        event.nativeEvent.targetContentOffset?.x ??
        event.nativeEvent.contentOffset.x;
      const index = getIndexForScrollOffset(offset, markets.length);
      const market = markets[index];

      lastScrolledIndex.current = index;
      if (market !== undefined) {
        onSelect(market.id);
      }
    },
    [markets, onSelect],
  );

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Math.abs(event.nativeEvent.velocity?.x ?? 0) < 0.01) {
        handleScrollEnd(event);
      }
    },
    [handleScrollEnd],
  );

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
        <ScrollView
          ref={scrollViewRef}
          horizontal
          bounces={false}
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('items-center', {
            paddingHorizontal: Math.max((containerWidth - ITEM_WIDTH) / 2, 0),
          })}
          testID={MarketGroupCardTestIds.selector(groupKey)}
          onLayout={handleLayout}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleScrollEnd}
        >
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
                  fontWeight={isSelected ? FontWeight.Bold : FontWeight.Medium}
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
        </ScrollView>
      </MaskedView>
      <Box
        testID={MarketGroupCardTestIds.selectionMarker(groupKey)}
        pointerEvents="none"
        style={styles.selectionMarker}
      />
    </Box>
  );
};
