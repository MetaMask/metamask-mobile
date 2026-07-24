import React, { useCallback, useEffect } from 'react';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { ONBOARDING_SUCCESS_FLOW } from '../../../../../constants/onboarding';
import Routes from '../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  markFirstPredictionOnUsOfferViewed,
  markFirstPredictionOnUsSkipped,
} from '../../../../../reducers/rewards';
import type { FirstPredictOnUsDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import type { PredictMarket } from '../../../Predict/types';
import FirstPredictOnUsSplashLayout from './FirstPredictOnUsSplashLayout';

export interface FirstPredictOnUsSplashRouteParams {
  content: FirstPredictOnUsDto;
  markets: PredictMarket[];
  successFlow?: ONBOARDING_SUCCESS_FLOW;
}

type FirstPredictOnUsSplashRoute = RouteProp<
  { FirstPredictOnUsSplash: FirstPredictOnUsSplashRouteParams | undefined },
  'FirstPredictOnUsSplash'
>;

/**
 * Splash screen for the First Predict On Us onboarding campaign.
 *
 * Registered as a flat, opaque onboarding step on `OnboardingNav` and shown for
 * eligible seedless (social-login) users after any survey and before the
 * "wallet ready" success screen. All gating (feature flag, one-time guard, geo
 * eligibility, content + market resolution) is handled off-screen by
 * `resolveFirstPredictOnUsLaunch` before this screen is navigated to, so it only
 * renders once fully-resolved `content` and `markets` are available — there is
 * no loading or error state here by design. The flow is linear: dismissing
 * resets forward to `OnboardingSuccessFlow` → `OnboardingSuccess`.
 */
const FirstPredictOnUsSplashScreen: React.FC = () => {
  const navigation =
    useNavigation<NavigationProp<ReactNavigation.RootParamList>>();
  const route = useRoute<FirstPredictOnUsSplashRoute>();
  const params = route.params;
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const onClose = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: Routes.ONBOARDING.SUCCESS_FLOW,
          params: {
            screen: Routes.ONBOARDING.SUCCESS,
            params: {
              successFlow:
                params?.successFlow ??
                ONBOARDING_SUCCESS_FLOW.SEEDLESS_ONBOARDING,
            },
          },
        },
      ],
    });
  }, [navigation, params?.successFlow]);

  const onSkip = useCallback(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.FIRST_PREDICTION_ON_US_SKIPPED,
      ).build(),
    );
    dispatch(markFirstPredictionOnUsSkipped());
    onClose();
  }, [createEventBuilder, dispatch, onClose, trackEvent]);

  useEffect(() => {
    if (!params) {
      onClose();
      return;
    }

    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.FIRST_PREDICTION_ON_US_VIEWED,
      ).build(),
    );
    dispatch(markFirstPredictionOnUsOfferViewed());
  }, [createEventBuilder, dispatch, onClose, params, trackEvent]);

  if (!params) {
    return null;
  }

  const { content, markets } = params;

  return (
    <FirstPredictOnUsSplashLayout
      content={content}
      markets={markets}
      onSkip={onSkip}
    />
  );
};

export default FirstPredictOnUsSplashScreen;
