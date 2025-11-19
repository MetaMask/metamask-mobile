import React, {
  useCallback,
  useContext,
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
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { useTheme } from '../../../../../util/theme';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { headerStyle } from '../../routes';

const POLLING_INTERVAL = 3000; // 3 seconds
const TIMEOUT_DURATION = 30000; // 30 seconds

type VerificationStep = 'polling' | 'timeout' | 'rejected' | 'error';

const VerifyingRegistration = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { sdk } = useCardSDK();
  const [step, setStep] = useState<VerificationStep>('polling');
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

      if (response.verificationState === 'VERIFIED') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings(
                'card.card_onboarding.verifying_registration.success_toast',
              ),
            },
          ],
          iconName: IconName.Confirmation,
          iconColor: theme.colors.success.default,
          backgroundColor: theme.colors.success.muted,
          hasNoTimeout: false,
        });

        setTimeout(() => {
          if (mountedRef.current) {
            navigation.dispatch(StackActions.replace(Routes.CARD.HOME));
          }
        }, 500);
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
  }, [
    sdk,
    navigation,
    theme.colors.success.default,
    theme.colors.success.muted,
    toastRef,
  ]);

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
  }, [startPolling]);

  const headerRight = useMemo(
    () =>
      step !== 'polling'
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

  const renderActions = () => null;

  const getTitle = () => {
    switch (step) {
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
