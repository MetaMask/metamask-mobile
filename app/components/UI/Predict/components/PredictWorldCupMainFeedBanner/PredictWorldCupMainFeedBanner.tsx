import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ImageSourcePropType, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectPredictWorldCupConfig } from '../../selectors/featureFlags';
import { PredictEventValues } from '../../constants/eventNames';
import type { PredictWorldCupConfig } from '../../types/flags';
import PredictWorldCupBannerCard, {
  type PredictWorldCupBannerCardVariant,
} from '../PredictWorldCupBannerCard';
import { PredictWorldCupMainFeedBannerSelectorsIDs } from './PredictWorldCupMainFeedBanner.testIds';

import worldCupMainFeedBannerImage from '../../assets/world-cup-main-feed-banner.png';
import worldCupMainFeedBannerCompactImage from '../../assets/world-cup-main-feed-banner-compact.png';

const WORLD_CUP_BANNER_DEFAULT_IMAGE_ASPECT_RATIO = 360 / 177;
const WORLD_CUP_BANNER_HORIZONTAL_MARGIN = 16;
const WORLD_CUP_BANNER_HORIZONTAL_MARGIN_TOTAL =
  WORLD_CUP_BANNER_HORIZONTAL_MARGIN * 2;

type PredictWorldCupMainFeedBannerVariant = PredictWorldCupBannerCardVariant;

export const getPredictWorldCupBannerSource = (
  bannerImage?: PredictWorldCupConfig['bannerImage'],
  fallbackImageSource?: ImageSourcePropType,
): ImageSourcePropType | undefined => {
  const trimmedBannerImageUrl = bannerImage?.url.trim();

  if (trimmedBannerImageUrl) {
    return { uri: trimmedBannerImageUrl };
  }

  return fallbackImageSource;
};

export const getPredictWorldCupBannerImageAspectRatio = (
  bannerImage?: PredictWorldCupConfig['bannerImage'],
): number => {
  if (bannerImage && bannerImage.width > 0 && bannerImage.height > 0) {
    return bannerImage.width / bannerImage.height;
  }

  return WORLD_CUP_BANNER_DEFAULT_IMAGE_ASPECT_RATIO;
};

interface PredictWorldCupMainFeedBannerProps {
  fallbackImageSource?: ImageSourcePropType | null;
  variant?: PredictWorldCupMainFeedBannerVariant;
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
> = ({ fallbackImageSource, variant = 'default' }) => {
  const { width: windowWidth } = useWindowDimensions();
  const navigation = useNavigation<AppNavigationProp>();
  const hasTrackedBannerViewed = useRef(false);
  const predictWorldCupConfig = useSelector(selectPredictWorldCupConfig);
  const bannerWidth = Math.max(
    windowWidth - WORLD_CUP_BANNER_HORIZONTAL_MARGIN_TOTAL,
    0,
  );
  const bannerImageAspectRatio = getPredictWorldCupBannerImageAspectRatio(
    predictWorldCupConfig.bannerImage,
  );
  const bannerImageHeight = bannerWidth / bannerImageAspectRatio;

  const defaultFallbackImageSource =
    variant === 'compact'
      ? worldCupMainFeedBannerCompactImage
      : worldCupMainFeedBannerImage;
  const resolvedFallbackImageSource =
    fallbackImageSource === undefined
      ? defaultFallbackImageSource
      : (fallbackImageSource ?? undefined);

  const imageSource = useMemo(
    () =>
      shouldRenderBanner(predictWorldCupConfig)
        ? getPredictWorldCupBannerSource(
            predictWorldCupConfig.bannerImage,
            resolvedFallbackImageSource,
          )
        : undefined,
    [resolvedFallbackImageSource, predictWorldCupConfig],
  );

  useEffect(() => {
    if (!imageSource || hasTrackedBannerViewed.current) {
      return;
    }

    Engine.context.PredictController.trackBannerAction({
      actionType: PredictEventValues.ACTION_TYPE.VIEWED,
      bannerType: PredictEventValues.BANNER_TYPE.WORLD_CUP,
    });
    hasTrackedBannerViewed.current = true;
  }, [imageSource]);

  const handlePress = useCallback(() => {
    Engine.context.PredictController.trackBannerAction({
      actionType: PredictEventValues.ACTION_TYPE.CLICKED,
      bannerType: PredictEventValues.BANNER_TYPE.WORLD_CUP,
    });
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.WORLD_CUP,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
      },
    });
  }, [navigation]);

  if (!imageSource) {
    return null;
  }

  const title = strings('predict.world_cup.banner_title');
  const description = strings('predict.world_cup.banner_description');

  return (
    <PredictWorldCupBannerCard
      variant={variant}
      imageSource={imageSource}
      imageHeight={bannerImageHeight}
      title={title}
      description={description}
      onPress={handlePress}
      accessibilityLabel={`${title}. ${description}`}
      containerClassName="mx-4 pb-3"
      testIDs={{
        container: PredictWorldCupMainFeedBannerSelectorsIDs.CONTAINER,
        image: PredictWorldCupMainFeedBannerSelectorsIDs.IMAGE,
      }}
    />
  );
};

export default PredictWorldCupMainFeedBanner;
