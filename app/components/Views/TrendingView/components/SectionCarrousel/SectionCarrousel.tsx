import { Box, BoxBorderColor } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useRef, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { SectionId, SECTIONS_CONFIG } from '../../config/sections.config';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = SCREEN_WIDTH;
const CARD_WIDTH = CONTENT_WIDTH * 0.8;
const CARD_HEIGHT = 220;

export interface SectionCarrouselProps {
  sectionId: SectionId;
  refreshTrigger?: number;
}

const SectionCarrousel: React.FC<SectionCarrouselProps> = ({
  sectionId,
  refreshTrigger,
}) => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const flashListRef = useRef<FlashListRef<unknown>>(null);

  const section = SECTIONS_CONFIG[sectionId];
  const { data, isLoading, refetch } = section.useSectionData();

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && refetch) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  const skeletonCount = 3;
  const skeletonData = Array.from({ length: skeletonCount });

  const displayData = isLoading ? skeletonData : data;

  return (
    <Box twClassName="mb-6">
      <FlashList
        ref={flashListRef}
        data={displayData}
        renderItem={({ item, index }) => {
          const isLastItem = index === displayData.length - 1;
          return (
            <Box style={tw.style({ width: CARD_WIDTH, height: CARD_HEIGHT })}>
              <Box
                borderColor={BoxBorderColor.BorderDefault}
                twClassName={`rounded-2xl overflow-hidden ${!isLastItem ? 'pr-4' : ''}`}
              >
                {isLoading ? (
                  <section.Skeleton />
                ) : (
                  <section.RowItem item={item} navigation={navigation} />
                )}
              </Box>
            </Box>
          );
        }}
        keyExtractor={
          isLoading
            ? (_, index) => `skeleton-${index}`
            : (_, index) => `${section.id}-${index}`
        }
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        testID={`${sectionId}-flash-list`}
      />
    </Box>
  );
};

export default SectionCarrousel;
