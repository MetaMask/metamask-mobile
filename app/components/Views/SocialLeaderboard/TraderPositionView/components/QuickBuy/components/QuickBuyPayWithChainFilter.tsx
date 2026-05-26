import React, { memo, useCallback, useRef } from 'react';
import {
  Image,
  LayoutChangeEvent,
  Pressable,
  type ImageSourcePropType,
} from 'react-native';
import { ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { calculateChipScrollX } from '../../../../../../UI/Predict/components/PredictChipList/PredictChipList';
import type { ChainOption } from '../hooks/useChainDisplayInfos';

export interface QuickBuyPayWithChainFilterProps {
  chains: ChainOption[];
  selectedChainId: string | null;
  onSelect: (chainId: string | null) => void;
  testID?: string;
}

const getChainFilterTestId = (chainId: string | null): string =>
  `quick-buy-chain-filter-${chainId ?? 'all'}`;

interface ChainFilterNetworkImageProps {
  source: ImageSourcePropType;
}

const ChainFilterNetworkImage: React.FC<ChainFilterNetworkImageProps> = ({
  source,
}) => {
  const tw = useTailwind();

  return (
    <Image
      source={source}
      style={tw.style('size-4 rounded')}
      testID="quick-buy-chain-filter-network-image"
    />
  );
};

const QuickBuyPayWithChainFilter: React.FC<QuickBuyPayWithChainFilterProps> = ({
  chains,
  selectedChainId,
  onSelect,
  testID = 'quick-buy-pay-with-chain-filter',
}) => {
  const tw = useTailwind();
  const scrollViewRef = useRef<GestureHandlerScrollView>(null);
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
      const viewportWidth = viewportWidthRef.current;
      if (!scrollView || viewportWidth === 0) {
        return;
      }

      const scrollX = calculateChipScrollX(
        chipIndex,
        chains.length,
        chipLayoutsRef.current,
        viewportWidth,
      );
      if (scrollX === null) {
        return;
      }

      scrollView.scrollTo({ x: scrollX, animated: true });
    },
    [chains.length],
  );

  const handlePress = useCallback(
    (chainId: string | null, index: number) => {
      onSelect(chainId);
      scrollToChip(index);
    },
    [onSelect, scrollToChip],
  );

  if (chains.length === 0) {
    return null;
  }

  return (
    <Box testID={testID} twClassName="pb-3">
      <GestureHandlerScrollView
        ref={scrollViewRef}
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 gap-2')}
        onLayout={handleScrollViewLayout}
      >
        {chains.map((chain, index) => {
          const isActive = chain.chainId === selectedChainId;
          return (
            <Pressable
              key={getChainFilterTestId(chain.chainId)}
              onPress={() => handlePress(chain.chainId, index)}
              onLayout={(event) => handleChipLayout(index, event)}
              style={tw.style(
                'rounded-lg px-3 py-1.5',
                isActive ? 'bg-icon-default' : 'bg-muted',
              )}
              testID={getChainFilterTestId(chain.chainId)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
              >
                {chain.imageSource ? (
                  <ChainFilterNetworkImage source={chain.imageSource} />
                ) : null}
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={
                    isActive ? TextColor.InfoInverse : TextColor.TextAlternative
                  }
                >
                  {chain.name}
                </Text>
              </Box>
            </Pressable>
          );
        })}
      </GestureHandlerScrollView>
    </Box>
  );
};

export default memo(QuickBuyPayWithChainFilter);
