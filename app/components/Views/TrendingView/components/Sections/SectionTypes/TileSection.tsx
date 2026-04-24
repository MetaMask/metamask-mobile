import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SECTIONS_CONFIG, type SectionId } from '../../../sections.config';
import ViewMoreCard from '../../../../Homepage/components/ViewMoreCard';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';

const MAX_ITEMS = 5;

export interface TileSectionProps {
  sectionId: SectionId;
  data: unknown[];
  isLoading: boolean;
}

const TileSection: React.FC<TileSectionProps> = ({
  sectionId,
  data,
  isLoading,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const section = SECTIONS_CONFIG[sectionId];

  const displayItems = useMemo(() => data.slice(0, MAX_ITEMS), [data]);
  const extra = section.useTileExtra?.(displayItems) ?? {};

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
          testID={`explore-${sectionId}-carousel`}
        >
          {displayItems.map((item, index) => (
            <section.RowItem
              key={section.getItemIdentifier(item)}
              item={item}
              index={index}
              navigation={navigation}
              extra={extra}
            />
          ))}
          <ViewMoreCard
            onPress={() => section.viewAllAction(navigation)}
            twClassName="w-[180px] flex-1"
            testID={`${sectionId}-view-more-card`}
          />
        </ScrollView>
      )}
    </Box>
  );
};

export default TileSection;
