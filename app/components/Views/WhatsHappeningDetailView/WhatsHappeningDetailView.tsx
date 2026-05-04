import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  ScrollView,
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

const HORIZONTAL_PADDING = 16;
const GAP = 12;
export const CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GAP;
const SNAP_INTERVAL = CARD_WIDTH + GAP;

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
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (initialIndex > 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: initialIndex * SNAP_INTERVAL,
        animated: false,
      });
    }
  }, [initialIndex]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SNAP_INTERVAL);
      setCurrentIndex(Math.max(0, Math.min(index, items.length - 1)));
    },
    [items.length],
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
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={SNAP_INTERVAL}
          snapToAlignment="start"
          style={tw`flex-1`}
          contentContainerStyle={tw.style(`px-4 gap-3 items-stretch`)}
          onMomentumScrollEnd={handleScrollEnd}
          testID="whats-happening-detail-carousel"
        >
          {items.map((item) => (
            <WhatsHappeningExpandedCard
              key={item.id}
              item={item}
              cardWidth={CARD_WIDTH}
            />
          ))}
        </ScrollView>

        <PageIndicator count={items.length} activeIndex={currentIndex} />
      </Box>
    </SafeAreaView>
  );
};

export default WhatsHappeningDetailView;
