import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import OnboardingStep from './OnboardingStep';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { ActivityIndicator, View } from 'react-native';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import { useCardSDK } from '../../sdk';
import Logger from '../../../../../util/Logger';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { CARD_SUPPORT_EMAIL } from '../../constants';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { headerStyle } from '../../routes';
import { useDispatch } from 'react-redux';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';

const POLLING_INTERVAL = 3000; // 3 seconds
const TIMEOUT_DURATION = 30000; // 30 seconds

type VerificationStep =
  | 'polling'
  | 'verified'
  | 'timeout'
  | 'rejected'
  | 'error';

const VerifyingRegistration = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { sdk, setUser } = useCardSDK();
  const [step, setStep] = useState<VerificationStep>('polling');
  const [isHandlingContinue, setIsHandlingContinue] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.VERIFYING_REGISTRATION,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleClose = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.VERIFYING_REGISTRATION_CLOSE_BUTTON,
        })
        .build(),
    );

    navigation.dispatch(StackActions.pop());
  }, [navigation, trackEvent, createEventBuilder]);

  const handleContinue = useCallback(async () => {
    setIsHandlingContinue(true);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.VERIFYING_REGISTRATION_CONTINUE_BUTTON,
        })
        .build(),
    );

    try {
      navigation.dispatch(StackActions.replace(Routes.CARD.HOME));
    } catch (error) {
      Logger.log('VerifyingRegistration::handleContinue error', error);
    } finally {
      setIsHandlingContinue(false);
    }
  }, [navigation, trackEvent, createEventBuilder]);

  const fetchUserDetails = useCallback(async () => {
    if (!sdk) {
      Logger.log('VerifyingRegistration: SDK not available');
      return;
    }

    try {
      const response = await sdk.getUserDetails();

      if (!mountedRef.current) {
        return;
      }

      setUser(response);

      if (response.verificationState === 'VERIFIED') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        if (mountedRef.current) {
          setStep('verified');
        }
        return;
      }

      if (response.verificationState === 'REJECTED') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        if (mountedRef.current) {
          setStep('rejected');
        }
        return;
      }
    } catch (err) {
      Logger.log('VerifyingRegistration: Error fetching user details', err);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (mountedRef.current) {
        setStep('error');
      }
    }
  }, [sdk, setUser]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    fetchUserDetails();

    intervalRef.current = setInterval(() => {
      fetchUserDetails();
    }, POLLING_INTERVAL);

    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        setStep('timeout');
      }
    }, TIMEOUT_DURATION);
  }, [fetchUserDetails]);

  useEffect(() => {
    mountedRef.current = true;
    dispatch(resetOnboardingState());
    startPolling();

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [startPolling, dispatch]);

  const headerRight = useMemo(
    () =>
      step !== 'polling' && step !== 'verified'
        ? () => (
            <ButtonIcon
              style={headerStyle.icon}
              size={ButtonIconSizes.Lg}
              iconName={IconName.Close}
              testID="close-button"
              onPress={handleClose}
            />
          )
        : () => <View />,
    [step, handleClose],
  );

  useEffect(() => {
    navigation.setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components
      headerLeft: () => <View />,
      headerRight,
    });
  }, [headerRight, navigation]);

  const renderFormFields = () => {
    switch (step) {
      case 'verified':
        return null; // Description will show the success message

      case 'error':
        return (
          <Box twClassName="items-center justify-center py-8 px-2">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              twClassName="text-default text-center mb-2"
            >
              {strings(
                'card.card_onboarding.verifying_registration.server_error_title',
              )}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-default text-center"
            >
              {strings(
                'card.card_onboarding.verifying_registration.server_error_message',
                { email: CARD_SUPPORT_EMAIL },
              )}
            </Text>
          </Box>
        );

      case 'rejected':
        return (
          <Box twClassName="items-center justify-center py-8 px-4">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-default text-center"
            >
              {strings(
                'card.card_onboarding.verifying_registration.rejected_message',
                { email: CARD_SUPPORT_EMAIL },
              )}
            </Text>
          </Box>
        );

      case 'polling':
        return (
          <Box twClassName="items-center justify-center py-8">
            <ActivityIndicator size="large" />
          </Box>
        );

      case 'timeout':
        return null;

      default:
        return null;
    }
  };

  const renderActions = () => {
    if (step === 'verified') {
      return (
        <Button
          variant={ButtonVariants.Primary}
          label={strings(
            'card.card_onboarding.verifying_registration.continue_button',
          )}
          size={ButtonSize.Lg}
          onPress={handleContinue}
          disabled={isHandlingContinue}
          loading={isHandlingContinue}
          width={ButtonWidthTypes.Full}
          testID="verifying-registration-continue-button"
        />
      );
    }
    return null;
  };

  const getTitle = () => {
    switch (step) {
      case 'verified':
        return strings(
          'card.card_onboarding.verifying_registration.verified_title',
        );
      case 'error':
        return strings(
          'card.card_onboarding.verifying_registration.server_error_title_main',
        );
      case 'rejected':
        return strings(
          'card.card_onboarding.verifying_registration.rejected_title',
        );
      case 'timeout':
        return strings(
          'card.card_onboarding.verifying_registration.timeout_title',
        );
      case 'polling':
      default:
        return strings('card.card_onboarding.verifying_registration.title');
    }
  };

  const getDescription = () => {
    switch (step) {
      case 'verified':
        return strings(
          'card.card_onboarding.verifying_registration.verified_description',
        );
      case 'error':
        return '';
      case 'rejected':
        return strings(
          'card.card_onboarding.verifying_registration.rejected_description',
        );
      case 'timeout':
        return strings(
          'card.card_onboarding.verifying_registration.timeout_description',
          { email: CARD_SUPPORT_EMAIL },
        );
      case 'polling':
      default:
        return strings(
          'card.card_onboarding.verifying_registration.description',
        );
    }
  };

  return (
    <OnboardingStep
      title={getTitle()}
      description={getDescription()}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default VerifyingRegistration;
