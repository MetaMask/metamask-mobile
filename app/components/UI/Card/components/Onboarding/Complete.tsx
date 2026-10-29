import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import {
  StackActions,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import { useDispatch } from 'react-redux';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { getCardBaanxToken } from '../../util/cardTokenVault';
import Logger from '../../../../../util/Logger';
import MM_CARD_ONBOARDING_SUCCESS from '../../../../../images/mm-card-onboarding-success.png';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import MarketingMoment from '../../../MarketingMoment';
import { CompleteSelectors } from './Complete.testIds';

/**
 * Route params for Complete screen
 * Used when navigating from deep link handlers
 */
type NextDestination = 'personal_details' | 'card_home';

interface CompleteRouteParams {
  /** Determines where to navigate after tapping continue
   * - 'personal_details': Navigate to PersonalDetails (from onboarding flow KYC approval)
   * - 'card_home': Navigate to CardHome (from authenticated flow KYC approval)
   * - undefined: Default behavior - check token and navigate accordingly
   */
  nextDestination?: NextDestination;
}

const Complete = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const handleNotNow = () => {
    navigation.goBack();
  };
  const [isLoading, setIsLoading] = useState(false);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const route =
    useRoute<RouteProp<{ params: CompleteRouteParams }, 'params'>>();
  const nextDestination = route.params?.nextDestination;

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(CardProviderIds.Baanx, {
            screen: CardScreens.COMPLETE,
          }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleContinue = async () => {
    setIsLoading(true);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Baanx, {
            action: CardActions.COMPLETE_BUTTON,
          }),
        )
        .build(),
    );

    try {
      // Handle navigation based on nextDestination param (from deep link)
      if (nextDestination === 'personal_details') {
        // Coming from onboarding flow KYC approval - continue to PersonalDetails
        navigation.dispatch(
          StackActions.replace(Routes.CARD.ONBOARDING.PERSONAL_DETAILS),
        );
        return;
      }

      if (nextDestination === 'card_home') {
        // Coming from authenticated flow KYC approval - go to CardHome
        dispatch(resetOnboardingState());
        navigation.dispatch(
          StackActions.replace(Routes.CARD.SPENDING_LIMIT, {
            flow: 'onboarding',
          }),
        );
        return;
      }

      // Default behavior: Check token and navigate accordingly
      const token = await getCardBaanxToken();
      if (token.success && token.tokenData?.accessToken) {
        dispatch(resetOnboardingState());
        navigation.dispatch(
          StackActions.replace(Routes.CARD.HOME, { fromCardOnboarding: true }),
        );
      } else {
        dispatch(resetOnboardingState());
        navigation.dispatch(StackActions.replace(Routes.CARD.AUTHENTICATION));
      }
    } catch (error) {
      Logger.log('Complete::handleContinue error', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MarketingMoment
      title={strings('card.card_onboarding.complete.title')}
      titleProps={{ testID: CompleteSelectors.TITLE }}
      description={strings('card.card_onboarding.complete.description')}
      descriptionProps={{
        testID: CompleteSelectors.DESCRIPTION,
        twClassName: 'text-center px-4',
      }}
      artwork={
        <Image
          source={MM_CARD_ONBOARDING_SUCCESS}
          resizeMode="contain"
          style={tw.style('h-full w-full')}
          testID={CompleteSelectors.IMAGE}
        />
      }
      primaryAction={{
        label: strings('card.card_onboarding.complete.confirm_button'),
        onPress: handleContinue,
        isDisabled: isLoading,
        isLoading,
        testID: CompleteSelectors.CONFIRM_BUTTON,
      }}
      secondaryAction={{
        label: strings('card.card_onboarding.not_now_button'),
        onPress: handleNotNow,
        isDisabled: isLoading,
        testID: CompleteSelectors.NOT_NOW_BUTTON,
      }}
    />
  );
};

export default Complete;
