import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectPredictWorldCupConfig } from '../../selectors/featureFlags';
import { PredictEventValues } from '../../constants/eventNames';
import type { PredictWorldCupConfig } from '../../types/flags';
import { PredictWorldCupMainFeedBannerSelectorsIDs } from './PredictWorldCupMainFeedBanner.testIds';

import worldCupMainFeedBannerImage from '../../assets/world-cup-main-feed-banner.png';

const WORLD_CUP_BANNER_ASPECT_RATIO = 360 / 177;
const WORLD_CUP_BANNER_HORIZONTAL_MARGIN = 16;
const WORLD_CUP_BANNER_HORIZONTAL_MARGIN_TOTAL =
  WORLD_CUP_BANNER_HORIZONTAL_MARGIN * 2;

export const getPredictWorldCupBannerSource = (
  bannerImageUrl?: string,
  fallbackImageSource?: ImageSourcePropType,
): ImageSourcePropType | undefined => {
  const trimmedBannerImageUrl = bannerImageUrl?.trim();

  if (trimmedBannerImageUrl) {
    return { uri: trimmedBannerImageUrl };
  }

  return fallbackImageSource;
};

interface PredictWorldCupMainFeedBannerProps {
  fallbackImageSource?: ImageSourcePropType | null;
}

const shouldRenderBanner = ({
  enabled,
  showMainFeedBanner,
  showWorldCupScreen,
}: Pick<
  PredictWorldCupConfig,
  'enabled' | 'showMainFeedBanner' | 'showWorldCupScreen'
>): boolean => enabled && showMainFeedBanner && showWorldCupScreen;

const PredictWorldCupMainFeedBanner: React.FC<
  PredictWorldCupMainFeedBannerProps
> = ({ fallbackImageSource }) => {
  const tw = useTailwind();
  const { width: windowWidth } = useWindowDimensions();
  const navigation = useNavigation();
  const hasTrackedBannerViewed = useRef(false);
  const predictWorldCupConfig = useSelector(selectPredictWorldCupConfig);
  const bannerWidth = Math.max(
    windowWidth - WORLD_CUP_BANNER_HORIZONTAL_MARGIN_TOTAL,
    0,
  );
  const bannerHeight = bannerWidth / WORLD_CUP_BANNER_ASPECT_RATIO;

  const resolvedFallbackImageSource =
    fallbackImageSource === undefined
      ? worldCupMainFeedBannerImage
      : (fallbackImageSource ?? undefined);

  const imageSource = useMemo(
    () =>
      shouldRenderBanner(predictWorldCupConfig)
        ? getPredictWorldCupBannerSource(
            predictWorldCupConfig.bannerImageUrl,
            resolvedFallbackImageSource,
          )
        : undefined,
    [resolvedFallbackImageSource, predictWorldCupConfig],
  );

  useEffect(() => {
    if (!imageSource || hasTrackedBannerViewed.current) {
      return;
    }

    Engine.context.PredictController.trackWorldCupBannerViewed({
      entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
    });
    hasTrackedBannerViewed.current = true;
  }, [imageSource]);

  const handlePress = useCallback(() => {
    Engine.context.PredictController.trackWorldCupBannerClicked({
      entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
    });
    navigation.navigate(Routes.PREDICT.WORLD_CUP, {
      entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
    });
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.WORLD_CUP,
    });
  }, [navigation]);

  if (!imageSource) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={tw.style('mx-4 pb-3')}
      testID={PredictWorldCupMainFeedBannerSelectorsIDs.CONTAINER}
    >
      <Image
        source={imageSource}
        resizeMode="cover"
        testID={PredictWorldCupMainFeedBannerSelectorsIDs.IMAGE}
        style={tw.style('w-full rounded-xl', { height: bannerHeight })}
      />
    </Pressable>
  );
};

export default PredictWorldCupMainFeedBanner;
