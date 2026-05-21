import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectPredictWorldCupConfig } from '../../selectors/featureFlags';
import { PredictEventValues } from '../../constants/eventNames';
import type { PredictWorldCupConfig } from '../../types/flags';
import { PredictWorldCupMainFeedBannerSelectorsIDs } from './PredictWorldCupMainFeedBanner.testIds';

import worldCupMainFeedBannerImage from '../../assets/world-cup-main-feed-banner.png';

const WORLD_CUP_BANNER_DEFAULT_IMAGE_ASPECT_RATIO = 360 / 177;
const WORLD_CUP_BANNER_HORIZONTAL_MARGIN = 16;
const WORLD_CUP_BANNER_HORIZONTAL_MARGIN_TOTAL =
  WORLD_CUP_BANNER_HORIZONTAL_MARGIN * 2;

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
  const bannerImageAspectRatio = getPredictWorldCupBannerImageAspectRatio(
    predictWorldCupConfig.bannerImage,
  );
  const bannerImageHeight = bannerWidth / bannerImageAspectRatio;

  const resolvedFallbackImageSource =
    fallbackImageSource === undefined
      ? worldCupMainFeedBannerImage
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

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={tw.style('mx-4 pb-3')}
      testID={PredictWorldCupMainFeedBannerSelectorsIDs.CONTAINER}
    >
      <View style={tw.style('bg-muted rounded-xl overflow-hidden')}>
        <Image
          source={imageSource}
          resizeMode="cover"
          testID={PredictWorldCupMainFeedBannerSelectorsIDs.IMAGE}
          style={tw.style('w-full rounded-t-xl', { height: bannerImageHeight })}
        />
        <View style={tw.style('flex-row items-center justify-between p-3')}>
          <View style={tw.style('flex-shrink')}>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Medium}
            >
              {strings('predict.world_cup.banner_title')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('predict.world_cup.banner_description')}
            </Text>
          </View>
          <ButtonIcon
            accessibilityLabel={strings('predict.world_cup.banner_title')}
            onPress={handlePress}
            iconName={IconName.ArrowRight}
            iconProps={{ size: ButtonIconSize.Md }}
            size={ButtonIconSize.Md}
            variant={ButtonIconVariant.Filled}
          />
        </View>
      </View>
    </Pressable>
  );
};

export default PredictWorldCupMainFeedBanner;
