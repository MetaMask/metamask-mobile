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
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import { useCardSDK } from '../../sdk';
import { getErrorMessage } from '../../util/getErrorMessage';
import Logger from '../../../../../util/Logger';
import NotificationManager from '../../../../../core/NotificationManager';
import {
  Box,
  Icon,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

const POLLING_INTERVAL = 3000; // 3 seconds
const TIMEOUT_DURATION = 30000; // 30 seconds

// Header component for close button (moved outside to avoid ESLint warning)
const CloseHeaderButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity onPress={onPress}>
    <Box twClassName="ml-4">
      <Icon name={IconName.Close} />
    </Box>
  </TouchableOpacity>
);

const VerifyingRegistration = () => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { sdk, setUser } = useCardSDK();
  const [isPolling, setIsPolling] = useState(true);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    navigation.dispatch(StackActions.replace(Routes.CARD.HOME));
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

      // Update user in SDK context
      // Map CardUserDetailsResponse to UserResponse format (convert null to undefined)
      setUser({
        ...response,
        addressLine2: response.addressLine2 ?? undefined,
        usState: response.usState ?? undefined,
        ssn: response.ssn ?? undefined,
      });

      // Check if user is verified
      if (response.verificationState === 'VERIFIED') {
        // Stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        setIsPolling(false);

        // Show success toast
        NotificationManager.showSimpleNotification({
          status: 'success',
          title: strings(
            'card.card_onboarding.verifying_registration.success_toast',
          ),
          duration: 3000,
        });

        // Navigate to Card Home
        setTimeout(() => {
          if (mountedRef.current) {
            navigation.dispatch(StackActions.replace(Routes.CARD.HOME));
          }
        }, 500);
        return;
      }

      // Check if verification was rejected
      if (response.verificationState === 'REJECTED') {
        // Stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        setIsPolling(false);
        setIsRejected(true);
        return;
      }

      // Continue polling if still PENDING or UNVERIFIED
    } catch (err) {
      Logger.log(
        'VerifyingRegistration: Error fetching registration status',
        err,
      );
      const errorMessage = getErrorMessage(err);
      if (mountedRef.current) {
        setError(errorMessage);
      }
    }
  }, [sdk, setUser, navigation]);

  const startPolling = useCallback(() => {
    // Clear any existing intervals/timeouts
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Fetch immediately
    fetchUserDetails();

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      fetchUserDetails();
    }, POLLING_INTERVAL);

    // Set up timeout after 30 seconds
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        // Stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        setIsPolling(false);
        setHasTimedOut(true);
      }
    }, TIMEOUT_DURATION);
  }, [fetchUserDetails]);

  // Start polling on mount
  useEffect(() => {
    mountedRef.current = true;
    startPolling();

    // Cleanup on unmount
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

  // Memoize the header left component to avoid recreating it on every render
  const headerLeft = useMemo(
    () =>
      hasTimedOut || isRejected
        ? () => <CloseHeaderButton onPress={handleClose} />
        : undefined,
    [hasTimedOut, isRejected, handleClose],
  );

  // Override the back button behavior when timed out or rejected to show X instead of back arrow
  useEffect(() => {
    if (headerLeft) {
      navigation.setOptions({
        headerLeft,
      });
    }
  }, [headerLeft, navigation]);

  const renderFormFields = () => {
    if (isRejected) {
      return (
        <Box twClassName="items-center justify-center py-8">
          <Icon name={IconName.Danger} />
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-error-default text-center mt-4"
          >
            {strings(
              'card.card_onboarding.verifying_registration.rejected_message',
              { email: 'support@cryptolife.com' },
            )}
          </Text>
        </Box>
      );
    }

    if (error) {
      return (
        <Box twClassName="items-center justify-center py-8">
          <Icon name={IconName.Danger} />
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-error-default text-center mt-4"
          >
            {error}
          </Text>
        </Box>
      );
    }

    if (isPolling) {
      return (
        <Box twClassName="items-center justify-center py-8">
          <ActivityIndicator size="large" />
        </Box>
      );
    }

    return null;
  };

  const renderActions = () => null;

  const getTitle = () => {
    if (isRejected) {
      return strings(
        'card.card_onboarding.verifying_registration.rejected_title',
      );
    }
    if (hasTimedOut) {
      return strings(
        'card.card_onboarding.verifying_registration.timeout_title',
      );
    }
    return strings('card.card_onboarding.verifying_registration.title');
  };

  const getDescription = () => {
    if (isRejected) {
      return strings(
        'card.card_onboarding.verifying_registration.rejected_description',
      );
    }
    if (hasTimedOut) {
      return strings(
        'card.card_onboarding.verifying_registration.timeout_description',
      );
    }
    return strings('card.card_onboarding.verifying_registration.description');
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
