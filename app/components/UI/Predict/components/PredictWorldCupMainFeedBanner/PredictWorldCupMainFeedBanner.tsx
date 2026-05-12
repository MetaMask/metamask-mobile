import React, { useCallback, useMemo } from 'react';
import { Image, ImageSourcePropType, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../constants/navigation/Routes';
import { selectPredictWorldCupConfig } from '../../selectors/featureFlags';
import type { PredictWorldCupConfig } from '../../types/flags';
import { PredictWorldCupMainFeedBannerSelectorsIDs } from './PredictWorldCupMainFeedBanner.testIds';

import worldCupMainFeedBannerImage from '../../assets/world-cup-main-feed-banner.png';

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
  const navigation = useNavigation();
  const predictWorldCupConfig = useSelector(selectPredictWorldCupConfig);

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

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.PREDICT.WORLD_CUP);
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
        style={tw.style('w-full rounded-xl')}
      />
    </Pressable>
  );
};

export default PredictWorldCupMainFeedBanner;
