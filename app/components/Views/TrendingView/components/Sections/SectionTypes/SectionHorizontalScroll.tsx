import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { ScrollView } from 'react-native';
import { SectionId, SECTIONS_CONFIG } from '../../../sections.config';
import { useNavigation } from '@react-navigation/native';
import ViewMoreCard from '../../../../Homepage/components/ViewMoreCard';

const MAX_ITEMS = 5;

export interface SectionHorizontalScrollProps {
  sectionId: SectionId;
  data: unknown[];
  isLoading: boolean;
}

const SectionHorizontalScroll: React.FC<SectionHorizontalScrollProps> = ({
  sectionId,
  data,
  isLoading,
}) => {
  const navigation = useNavigation();
  const tw = useTailwind();

  const section = SECTIONS_CONFIG[sectionId];

  const displayData = data.slice(0, MAX_ITEMS);

  return (
    <Box twClassName="-mx-4 mb-6">
      {isLoading ? (
        <Box twClassName="px-4">
          <section.Skeleton />
        </Box>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw.style('px-4 gap-2.5')}
          testID="homepage-trending-perps-carousel"
        >
          {(displayData ?? []).map((market, index) => (
            <section.RowItem
              key={`${section.id}-${index}`}
              item={market}
              index={index}
              navigation={navigation}
            />
          ))}
          <ViewMoreCard
            onPress={() => section.viewAllAction(navigation)}
            twClassName="w-[180px] flex-1"
            testID="perps-view-more-card"
          />
        </ScrollView>
      )}
    </Box>
  );
};

export default SectionHorizontalScroll;
