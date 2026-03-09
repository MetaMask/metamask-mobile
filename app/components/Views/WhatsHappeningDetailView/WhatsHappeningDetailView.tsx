import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  HeaderBase,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import type { WhatsHappeningItem } from '../Homepage/Sections/WhatsHappening/types';
import WhatsHappeningExpandedCard from './components/WhatsHappeningExpandedCard';
import PageIndicator from './components/PageIndicator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WhatsHappeningDetailParams {
  items: WhatsHappeningItem[];
  initialIndex: number;
}

const WhatsHappeningDetailView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const route =
    useRoute<RouteProp<{ params: WhatsHappeningDetailParams }, 'params'>>();

  const { items, initialIndex = 0 } = route.params;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList<WhatsHappeningItem>>(null);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      setCurrentIndex(index);
    },
    [],
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-default`}>
      <HeaderBase
        startAccessory={
          <ButtonIcon
            size={ButtonIconSize.Lg}
            onPress={handleBackPress}
            iconName={IconName.ArrowLeft}
            testID="whats-happening-detail-back-button"
          />
        }
        style={tw`p-4`}
        twClassName="h-auto"
      >
        {strings('homepage.sections.whats_happening')}
      </HeaderBase>

      <Box twClassName="flex-1">
        <FlatList
          ref={flatListRef}
          data={items}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={handleScrollEnd}
          renderItem={({ item }) => <WhatsHappeningExpandedCard item={item} />}
          keyExtractor={(item) => item.id}
          testID="whats-happening-detail-carousel"
        />

        <PageIndicator count={items.length} activeIndex={currentIndex} />
      </Box>
    </SafeAreaView>
  );
};

export default WhatsHappeningDetailView;
