import React, { useCallback, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import type {
  PredictMarket,
  PredictMarketBuyButtonPress,
} from '../../../Predict/types';
import PredictMarketCard from '../../../Predict/components/PredictMarket';
import { PaginationDots } from '../../../Predict/components/PaginationDots/PaginationDots';
import { PredictEventValues } from '../../../Predict/constants/eventNames';

const CARD_GAP = 8;
/** Width reserved so the next carousel card peeks in from the trailing edge. */
const CARD_PEEK = 20;
const CAROUSEL_CARD_HEIGHT = 210;

interface FirstPredictOnUsMarketsCarouselProps {
  confirmLabel: string;
  markets: PredictMarket[];
  usdAmount: number;
}

const FirstPredictOnUsMarketsCarousel: React.FC<
  FirstPredictOnUsMarketsCarouselProps
> = ({ confirmLabel, markets, usdAmount }) => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const navigation =
    useNavigation<NavigationProp<ReactNavigation.RootParamList>>();
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const { cardWidth, snapInterval } = useMemo(() => {
    if (containerWidth <= 0) {
      return { cardWidth: 0, snapInterval: 0 };
    }

    const width = containerWidth - CARD_PEEK;
    return {
      cardWidth: width,
      snapInterval: width + CARD_GAP,
    };
  }, [containerWidth]);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (snapInterval <= 0) {
        return;
      }

      const offsetX = event.nativeEvent.contentOffset.x;
      setActiveIndex(
        Math.min(
          Math.max(0, Math.round(offsetX / snapInterval)),
          markets.length - 1,
        ),
      );
    },
    [markets.length, snapInterval],
  );

  const handleBuyButtonPress = useCallback<PredictMarketBuyButtonPress>(
    (params) => {
      const marketId = params.market.id;
      const outcome = params.outcomeToken.title;

      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.FIRST_PREDICTION_ON_US_OUTCOME_OPENED,
        )
          .addProperties({
            market_id: marketId,
            outcome,
          })
          .build(),
      );
      navigation.navigate(Routes.ONBOARDING.FIRST_PREDICT_ON_US_ORDER_SHEET, {
        confirmLabel,
        selectedOrder: params,
        usdAmount,
      });
      return true;
    },
    [confirmLabel, createEventBuilder, navigation, trackEvent, usdAmount],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: PredictMarket; index: number }) => (
      <Box
        style={tw.style(
          { width: cardWidth, height: CAROUSEL_CARD_HEIGHT },
          index < markets.length - 1 && { marginRight: CARD_GAP },
        )}
      >
        <PredictMarketCard
          market={item}
          entryPoint={PredictEventValues.ENTRY_POINT.CAROUSEL}
          isCarousel
          cardPressDisabled
          onBuyButtonPress={handleBuyButtonPress}
          testID={`first-predict-on-us-market-card-${index}`}
        />
      </Box>
    ),
    [cardWidth, handleBuyButtonPress, markets.length, tw],
  );

  const keyExtractor = useCallback((item: PredictMarket) => item.id, []);

  if (markets.length === 0) {
    return null;
  }

  return (
    <Box
      testID="first-predict-on-us-splash-carousel"
      twClassName="gap-2"
      onLayout={handleContainerLayout}
    >
      {containerWidth > 0 ? (
        <FlashList
          data={markets}
          horizontal
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsHorizontalScrollIndicator={false}
          snapToInterval={snapInterval}
          decelerationRate="fast"
          disableIntervalMomentum
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={tw.style({ height: CAROUSEL_CARD_HEIGHT })}
        />
      ) : null}
      <PaginationDots count={markets.length} activeIndex={activeIndex} />
    </Box>
  );
};

export default FirstPredictOnUsMarketsCarousel;
