import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import OnboardingStep from './OnboardingStep';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import { useDispatch } from 'react-redux';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
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
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const Complete = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const [isLoading, setIsLoading] = useState(false);
  const { trackEvent, createEventBuilder } = useMetrics();

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
      const token = await getCardBaanxToken();
      if (token.success && token.tokenData?.accessToken) {
        dispatch(resetOnboardingState());
        navigation.dispatch(StackActions.replace(Routes.CARD.HOME));
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
      variant={ButtonVariants.Primary}
      label={strings('card.card_onboarding.complete.confirm_button')}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      disabled={isLoading}
      loading={isLoading}
      width={ButtonWidthTypes.Full}
      testID="complete-confirm-button"
    />
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
