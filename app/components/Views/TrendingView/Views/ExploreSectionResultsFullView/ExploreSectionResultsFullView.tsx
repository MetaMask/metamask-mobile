import React, { useCallback } from 'react';
import { Platform } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  FontWeight,
} from '@metamask/design-system-react-native';
import { SECTIONS_CONFIG, type SectionId } from '../../sections.config';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ExploreSectionResultsFullViewParams = {
  ExploreSectionResultsFullView: {
    sectionId: SectionId;
    title: string;
    searchQuery: string;
  };
};

interface SectionContentProps {
  sectionId: SectionId;
  searchQuery: string;
}

const SectionContent: React.FC<SectionContentProps> = ({
  sectionId,
  searchQuery,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const section = SECTIONS_CONFIG[sectionId];

  const { data, isLoading } = section.useSectionData(searchQuery);

  const renderItem: ListRenderItem<unknown> = useCallback(
    ({ item, index }) => {
      const RowItemComponent = section.OverrideRowItemSearch ?? section.RowItem;
      return (
        <RowItemComponent
          item={item}
          index={index}
          navigation={navigation as never}
        />
      );
    },
    [section, navigation],
  );

  const keyExtractor = useCallback(
    (_item: unknown, index: number) => `${sectionId}-${index}`,
    [sectionId],
  );

  if (isLoading) {
    const SkeletonComponent =
      section.OverrideSkeletonSearch ?? section.Skeleton;
    return (
      <Box twClassName="px-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonComponent key={`skeleton-${i}`} />
        ))}
      </Box>
    );
  }

  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={tw.style('px-4')}
      showsVerticalScrollIndicator={false}
    />
  );
};

const ExploreSectionResultsFullView: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<
        ExploreSectionResultsFullViewParams,
        'ExploreSectionResultsFullView'
      >
    >();

  const { sectionId, title, searchQuery } = route.params;
  const section = SECTIONS_CONFIG[sectionId];
  const Wrapper = section.SectionWrapper ?? React.Fragment;

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <Box
      style={{ paddingTop: insets.top + (Platform.OS === 'android' ? 16 : 0) }}
      twClassName="flex-1 bg-default"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 pb-3 gap-3"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Sm}
          onPress={handleGoBack}
          accessibilityLabel="Go back"
        />
        <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
          {title}
        </Text>
      </Box>

      <Wrapper>
        <SectionContent sectionId={sectionId} searchQuery={searchQuery} />
      </Wrapper>
    </Box>
  );
};

export default ExploreSectionResultsFullView;
