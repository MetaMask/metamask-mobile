import React, { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { handleRewardsUrl } from '../../../../../core/DeeplinkManager/handlers/legacy/handleRewardsUrl';
import { selectPredictWorldCupHubBannerEnabledFlag } from '../../selectors/featureFlags';
import { PredictEventValues } from '../../constants/eventNames';
import PredictWorldCupBannerCard from '../PredictWorldCupBannerCard';
import { PredictWorldCupHubBannerSelectorsIDs } from './PredictWorldCupHubBanner.testIds';

import predictThePitchImage from '../../assets/predict-the-pitch-hub-banner.png';

const PREDICT_THE_PITCH_REWARDS_PATH = '/rewards?campaign=predict-the-pitch';

/**
 * Promotional "$75K up for grabs" banner for the Predict the Pitch leaderboard
 * campaign, rendered directly below the World Cup Hub header. Visibility is
 * gated behind the `showHubBanner` sub-flag of the `predictWorldCup` LD flag.
 * Tapping routes internally to the Rewards view via `handleRewardsUrl` to avoid
 * the Safari-opens-universal-link pitfall of `Linking.openURL`.
 */
const PredictWorldCupHubBanner: React.FC = () => {
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

  const title = strings('predict.world_cup.hub_banner_title');
  const description = strings('predict.world_cup.hub_banner_description');

  return (
    <PredictWorldCupBannerCard
      variant="compact"
      imageSource={predictThePitchImage}
      title={title}
      description={description}
      onPress={handlePress}
      accessibilityLabel={`${title}. ${description}`}
      containerClassName="mx-4 mb-3"
      testIDs={{
        container: PredictWorldCupHubBannerSelectorsIDs.CONTAINER,
        image: PredictWorldCupHubBannerSelectorsIDs.IMAGE,
        arrow: PredictWorldCupHubBannerSelectorsIDs.ARROW,
      }}
    />
  );
};

export default PredictWorldCupHubBanner;
