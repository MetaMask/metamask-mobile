import React, { useCallback } from 'react';
import { Platform } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import {
  useNavigation,
  useRoute,
  RouteProp,
  NavigationProp,
} from '@react-navigation/native';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
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
import { TrackedRowItem, useScrollTracking } from '../../utils/exploreSearch';

interface SectionContentProps {
  sectionId: SectionId;
  searchQuery: string;
  data: unknown[];
}

const SectionContent: React.FC<SectionContentProps> = ({
  sectionId,
  searchQuery,
  data,
}) => {
  const tw = useTailwind();
  const section = SECTIONS_CONFIG[sectionId];

  const { onScrollBeginDrag } = useScrollTracking(
    'view_all_scrolled',
    searchQuery,
    { section_name: section.title },
  );

  const renderItem: ListRenderItem<unknown> = useCallback(
    ({ item, index }) => (
      <TrackedRowItem
        section={section}
        item={item}
        index={index}
        searchQuery={searchQuery}
        interactionType="view_all_item_clicked"
      />
    ),
    [section, searchQuery],
  );

  const keyExtractor = useCallback(
    (item: unknown, index: number) =>
      `${sectionId}-${section.getItemIdentifier(item) || index}`,
    [sectionId, section],
  );

  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={tw.style('px-4')}
      showsVerticalScrollIndicator={false}
      onScrollBeginDrag={onScrollBeginDrag}
    />
  );
};

const ExploreSectionResultsFullView: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'ExploreSectionResultsFullView'>>();

  const { sectionId, title, searchQuery, data } = route.params;
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
        <SectionContent
          sectionId={sectionId}
          searchQuery={searchQuery}
          data={data}
        />
      </Wrapper>
    </Box>
  );
};

export default ExploreSectionResultsFullView;
