import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import useCardOAuth2Authentication from '../../hooks/useCardOAuth2Authentication';
import { CardAuthenticationSelectors } from './CardAuthentication.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useSelector } from 'react-redux';
import { selectIsAuthenticatedCard } from '../../../../../core/redux/slices/card';
import { CardActions, CardScreens } from '../../util/metrics';
import OnboardingStep from '../../components/Onboarding/OnboardingStep';

/**
 * Card authentication screen using OAuth 2.0 Authorization Code Flow with PKCE.
 *
 * This replaces the email/password/OTP login form with a single
 * "Log in" button that opens the system browser for authentication.
 */
const CardOAuth2Authentication = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);

  const { login, loading, isReady, error, clearError } =
    useCardOAuth2Authentication();

  // Track screen view
  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.AUTHENTICATION,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  // Navigate to home when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
    }
  }, [isAuthenticated, navigation]);

  const handleLogin = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.AUTHENTICATION_LOGIN_BUTTON,
        })
        .build(),
    );

    if (error) {
      clearError();
    }

    await login();
  }, [login, trackEvent, createEventBuilder, error, clearError]);

  const actions = useMemo(
    () => (
      <Box twClassName="flex flex-col justify-center gap-2">
        {error && (
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-error-default"
            testID="login-error-text"
          >
            {error}
          </Text>
        )}
        <Box>
          <Button
            variant={ButtonVariants.Primary}
            label={strings('card.card_authentication.login_button')}
            size={ButtonSize.Lg}
            testID={CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON}
            onPress={handleLogin}
            loading={loading}
            width={ButtonWidthTypes.Full}
            isDisabled={!isReady || loading}
          />
          <TouchableOpacity
            onPress={() => navigation.navigate(Routes.CARD.ONBOARDING.ROOT)}
          >
            <Text
              testID={CardAuthenticationSelectors.SIGNUP_BUTTON}
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              twClassName="text-default text-center p-4"
            >
              {strings('card.card_authentication.signup_button')}
            </Text>
          </TouchableOpacity>
        </Box>
      </Box>
    ),
    [error, handleLogin, loading, isReady, navigation],
  );

  return (
    <OnboardingStep
      title={strings('card.card_authentication.title')}
      description=""
      formFields={null}
      actions={actions}
    />
  );
};

export default CardOAuth2Authentication;
