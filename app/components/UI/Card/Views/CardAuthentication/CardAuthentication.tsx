import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CardCredentials } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import { useCardAuth } from '../../hooks/useCardAuth';
import useCardOAuth2Authentication from '../../hooks/useCardOAuth2Authentication';
import { CardAuthenticationSelectors } from './CardAuthentication.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import CardMessageBox from '../../components/CardMessageBox/CardMessageBox';
import Logger from '../../../../../util/Logger';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useDispatch, useSelector } from 'react-redux';
import { setOnboardingId } from '../../../../../core/redux/slices/card';
import { selectCardUserLocation } from '../../../../../selectors/cardController';
import { CardMessageBoxType, type CardLocation } from '../../types';
import { CardActions, CardScreens } from '../../util/metrics';
import OnboardingStep from '../../components/Onboarding/OnboardingStep';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { countryCodeToFlag } from '../../util/countryCodeToFlag';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CardAuthenticationParams = {
  CardAuthentication: { showAuthPrompt?: boolean } | undefined;
};

const CardAuthentication = () => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<CardAuthenticationParams, 'CardAuthentication'>>();
  const showAuthPrompt = route.params?.showAuthPrompt ?? false;
  const persistedLocation = useSelector(selectCardUserLocation);
  const [selectedLocation, setSelectedLocation] = useState<CardLocation>(
    persistedLocation ?? 'international',
  );
  const dispatch = useDispatch();
  const theme = useTheme();

  const { initiate, submit, getErrorMessage } = useCardAuth();

  const submitCredentials = useCallback(
    (credentials: CardCredentials) => submit.mutateAsync(credentials),
    [submit],
  );

  const oauth = useCardOAuth2Authentication({
    isUsRegion: selectedLocation === 'us',
    submitCredentials,
  });

  const handleLocationChange = useCallback(
    (loc: CardLocation) => {
      setSelectedLocation(loc);
      initiate.reset();
      submit.reset();
      oauth.clearError();
    },
    [initiate, submit, oauth],
  );

  const loading = initiate.isPending || submit.isPending || oauth.loading;
  const submitOrInitiateError =
    initiate.error || submit.error
      ? getErrorMessage(initiate.error ?? submit.error)
      : null;
  const displayError = oauth.error ?? submitOrInitiateError;

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.AUTHENTICATION,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const performOAuthLogin = useCallback(async () => {
    oauth.clearError();
    initiate.reset();
    submit.reset();

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.AUTHENTICATION_LOGIN_BUTTON,
        })
        .build(),
    );

    try {
      await initiate.mutateAsync(selectedLocation);
      const result = await oauth.login();

      if (!result) {
        return;
      }

      if (result.onboardingRequired) {
        dispatch(setOnboardingId(result.onboardingRequired.sessionId));
        navigation.reset({
          index: 0,
          routes: [
            {
              name: Routes.CARD.ONBOARDING.ROOT,
              params: { cardUserPhase: result.onboardingRequired.phase },
            },
          ],
        });
        return;
      }

      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
    } catch (err) {
      Logger.log('CardAuthentication::OAuth login failed', err);
    }
  }, [
    initiate,
    oauth,
    selectedLocation,
    navigation,
    dispatch,
    trackEvent,
    createEventBuilder,
    submit,
  ]);

  const isLoginDisabled = useMemo(() => !oauth.isReady, [oauth.isReady]);

  const title = strings('card.card_authentication.title');
  const description = strings('card.card_authentication.oauth_description');

  const formFields = useMemo(
    () => (
      <>
        {showAuthPrompt && (
          <CardMessageBox messageType={CardMessageBoxType.AuthPrompt} />
        )}
        <Box twClassName="flex-row justify-between gap-2">
          <TouchableOpacity
            onPress={() => handleLocationChange('international')}
            style={tw.style(
              `flex flex-col items-center justify-center flex-1 bg-background-muted rounded-lg ${selectedLocation === 'international' ? 'border border-text-default' : ''}`,
            )}
          >
            <Box
              twClassName="flex flex-col items-center justify-center w-full p-4"
              testID="international-location-box"
            >
              <Icon name={IconName.Global} size={IconSize.Lg} />
              <Text
                twClassName="text-center text-body-sm font-medium"
                variant={TextVariant.BodySm}
              >
                {strings('card.card_authentication.location_button_text')}
              </Text>
            </Box>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleLocationChange('us')}
            style={tw.style(
              `flex flex-col items-center justify-center flex-1 bg-background-muted rounded-lg ${selectedLocation === 'us' ? 'border border-text-default' : ''}`,
            )}
          >
            <Box
              twClassName="flex flex-col items-center justify-center flex-1 w-full p-4"
              testID="us-location-box"
            >
              <Text twClassName="text-center">{countryCodeToFlag('US')}</Text>
              <Text
                twClassName="text-center text-body-sm font-medium"
                variant={TextVariant.BodySm}
              >
                {strings('card.card_authentication.location_button_text_us')}
              </Text>
            </Box>
          </TouchableOpacity>
        </Box>
      </>
    ),
    [handleLocationChange, selectedLocation, showAuthPrompt, tw],
  );

  const actions = useMemo(
    () => (
      <Box twClassName="flex flex-col justify-center gap-2">
        {displayError && (
          <Text
            variant={TextVariant.BodySm}
            style={{ color: theme.colors.error.default }}
            testID="login-error-text"
          >
            {displayError}
          </Text>
        )}
        <Box>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            testID={CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON}
            onPress={() => performOAuthLogin()}
            isLoading={loading}
            isFullWidth
            isDisabled={isLoginDisabled || loading}
          >
            {strings('card.card_authentication.login_button')}
          </Button>
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
    [
      displayError,
      isLoginDisabled,
      loading,
      navigation,
      performOAuthLogin,
      theme.colors.error.default,
    ],
  );

  return (
    <OnboardingStep
      title={title}
      description={description}
      formFields={formFields}
      actions={actions}
    />
  );
};

export default CardAuthentication;
