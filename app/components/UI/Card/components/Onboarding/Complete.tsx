import React, { useEffect, useState } from 'react';
import {
  StackActions,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { getCardBaanxToken } from '../../util/cardTokenVault';
import Logger from '../../../../../util/Logger';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import CardVerifiedContent from './CardVerifiedContent';

export { COMPLETE_ENTRANCE_START_TIMEOUT_MS } from './CardVerifiedContent';

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

/**
 * Baanx card onboarding success ("You're verified"). Continue is the only
 * exit. The visual lives in `CardVerifiedContent`, which Immersve also shows
 * in place after KYC.
 */
const Complete = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
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
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
      />
      <CardVerifiedContent onContinue={handleContinue} isLoading={isLoading} />
    </SafeAreaView>
  );
};

export default Complete;
