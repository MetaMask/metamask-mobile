import React, { useCallback, useEffect, useRef } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  FontWeight,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { handleRewardsUrl } from '../../../../../core/DeeplinkManager/handlers/legacy/handleRewardsUrl';
import { selectPredictWorldCupHubBannerEnabledFlag } from '../../selectors/featureFlags';
import { PredictEventValues } from '../../constants/eventNames';
import { PredictWorldCupHubBannerSelectorsIDs } from './PredictWorldCupHubBanner.testIds';

import predictThePitchImage from '../../assets/predict-the-pitch-hub-banner.png';

const PREDICT_THE_PITCH_REWARDS_PATH = '/rewards?campaign=predict-the-pitch';
const HUB_BANNER_IMAGE_SIZE = 80;

/**
 * Promotional "$75K up for grabs" banner for the Predict the Pitch leaderboard
 * campaign, rendered directly below the World Cup Hub header. Visibility is
 * gated behind the `showHubBanner` sub-flag of the `predictWorldCup` LD flag.
 * Tapping routes internally to the Rewards view via `handleRewardsUrl` to avoid
 * the Safari-opens-universal-link pitfall of `Linking.openURL`.
 */
const PredictWorldCupHubBanner: React.FC = () => {
  const tw = useTailwind();
  const isEnabled = useSelector(selectPredictWorldCupHubBannerEnabledFlag);
  const hasTrackedBannerViewed = useRef(false);

  useEffect(() => {
    if (!isEnabled || hasTrackedBannerViewed.current) {
      return;
    }

    Engine.context.PredictController.trackBannerAction({
      actionType: PredictEventValues.ACTION_TYPE.VIEWED,
      bannerType: PredictEventValues.BANNER_TYPE.PREDICT_THE_PITCH,
    });
    hasTrackedBannerViewed.current = true;
  }, [isEnabled]);

  const handlePress = useCallback(() => {
    Engine.context.PredictController.trackBannerAction({
      actionType: PredictEventValues.ACTION_TYPE.CLICKED,
      bannerType: PredictEventValues.BANNER_TYPE.PREDICT_THE_PITCH,
    });
    handleRewardsUrl({ rewardsPath: PREDICT_THE_PITCH_REWARDS_PATH });
  }, []);

  if (!isEnabled) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={tw.style('mx-4 mb-3')}
      testID={PredictWorldCupHubBannerSelectorsIDs.CONTAINER}
    >
      <View
        style={tw.style(
          'bg-muted rounded-xl overflow-hidden flex-row items-center',
        )}
      >
        <Image
          source={predictThePitchImage}
          resizeMode="cover"
          testID={PredictWorldCupHubBannerSelectorsIDs.IMAGE}
          style={tw.style('rounded-l-xl', {
            height: HUB_BANNER_IMAGE_SIZE,
            width: HUB_BANNER_IMAGE_SIZE,
          })}
        />
        <View
          style={tw.style('flex-row items-center justify-between p-3 flex-1')}
        >
          <View style={tw.style('flex-shrink')}>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Medium}
            >
              {strings('predict.world_cup.hub_banner_title')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('predict.world_cup.hub_banner_description')}
            </Text>
          </View>
          <ButtonIcon
            accessibilityLabel={strings('predict.world_cup.hub_banner_title')}
            onPress={handlePress}
            iconName={IconName.ArrowRight}
            iconProps={{ size: IconSize.Md }}
            size={ButtonIconSize.Md}
            variant={ButtonIconVariant.Filled}
          />
        </View>
      </View>
    </Pressable>
  );
};

export default PredictWorldCupHubBanner;
