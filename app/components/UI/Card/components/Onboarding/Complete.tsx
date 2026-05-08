import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import {
  StackActions,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import OnboardingStep from './OnboardingStep';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  resetOnboardingState,
  selectOnboardingCompletionIntent,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens } from '../../util/metrics';
import { getCardBaanxToken } from '../../util/cardTokenVault';
import Logger from '../../../../../util/Logger';
import MM_CARD_ONBOARDING_SUCCESS from '../../../../../images/mm-card-onboarding-success.png';
import {
  Box,
  FontFamily,
  FontWeight,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  MONEY_ACCOUNT_CARD_COMPLETION_INTENT,
  MONEY_ACCOUNT_CARD_SPENDING_LIMIT_PARAMS,
} from '../../util/moneyAccountCardRouteParams';

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
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const [isLoading, setIsLoading] = useState(false);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const route =
    useRoute<RouteProp<{ params: CompleteRouteParams }, 'params'>>();
  const nextDestination = route.params?.nextDestination;
  const completionIntent = useSelector(selectOnboardingCompletionIntent);
  const shouldUseMoneyAccountSpendingLimit =
    completionIntent === MONEY_ACCOUNT_CARD_COMPLETION_INTENT;

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.COMPLETE,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleContinue = async () => {
    setIsLoading(true);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.COMPLETE_BUTTON,
        })
        .build(),
    );

    try {
      if (nextDestination === 'personal_details') {
        navigation.dispatch(
          StackActions.replace(Routes.CARD.ONBOARDING.PERSONAL_DETAILS),
        );
        return;
      }

      if (nextDestination === 'card_home') {
        dispatch(resetOnboardingState());
        if (shouldUseMoneyAccountSpendingLimit) {
          navigation.dispatch(
            StackActions.replace(
              Routes.CARD.SPENDING_LIMIT,
              MONEY_ACCOUNT_CARD_SPENDING_LIMIT_PARAMS,
            ),
          );
          return;
        }

        navigation.dispatch(
          StackActions.replace(Routes.CARD.SPENDING_LIMIT, {
            flow: 'onboarding',
          }),
        );
        return;
      }

      const token = await getCardBaanxToken();
      if (token.success && token.tokenData?.accessToken) {
        dispatch(resetOnboardingState());
        if (shouldUseMoneyAccountSpendingLimit) {
          navigation.dispatch(
            StackActions.replace(
              Routes.CARD.SPENDING_LIMIT,
              MONEY_ACCOUNT_CARD_SPENDING_LIMIT_PARAMS,
            ),
          );
          return;
        }

        navigation.dispatch(StackActions.replace(Routes.CARD.HOME));
      } else {
        dispatch(resetOnboardingState());
        navigation.dispatch(
          StackActions.replace(
            Routes.CARD.AUTHENTICATION,
            completionIntent ? { completionIntent } : undefined,
          ),
        );
      }
    } catch (error) {
      Logger.log('Complete::handleContinue error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormFields = () => (
    <>
      <Box twClassName="flex flex-1 items-center justify-center">
        <Image
          source={MM_CARD_ONBOARDING_SUCCESS}
          resizeMode="contain"
          style={tw.style('w-full h-full')}
        />
      </Box>
      <Text
        fontFamily={FontFamily.Accent}
        fontWeight={FontWeight.Regular}
        twClassName="text-[36px] text-center leading-1"
      >
        {strings('card.card_onboarding.complete.title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-center text-text-alternative px-4"
      >
        {strings('card.card_onboarding.complete.description')}
      </Text>
    </>
  );

  const renderActions = () => (
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      isDisabled={isLoading}
      isLoading={isLoading}
      isFullWidth
      testID="complete-confirm-button"
    >
      {strings('card.card_onboarding.complete.confirm_button')}
    </Button>
  );

  return (
    <OnboardingStep
      title=""
      description=""
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default Complete;
