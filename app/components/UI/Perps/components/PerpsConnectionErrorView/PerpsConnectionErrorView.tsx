import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import styleSheet from './PerpsConnectionErrorView.styles';

interface PerpsConnectionErrorViewProps {
  error: string | Error;
  onRetry: () => void;
  isRetrying?: boolean;
  showBackButton?: boolean;
  retryAttempts?: number;
}

const PerpsConnectionErrorView: React.FC<PerpsConnectionErrorViewProps> = ({
  error,
  onRetry,
  isRetrying = false,
  showBackButton,
  retryAttempts = 0,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { track } = usePerpsEventTracking();

  const errorMessage =
    (typeof error === 'string' ? error : error?.message) ||
    PERPS_EVENT_VALUE.ERROR_MESSAGE_KEY.UNKNOWN;

  // Track error screen view with error context
  // resetConditions re-fires the event after retries so retry_attempts is accurate
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: PERPS_EVENT_VALUE.SCREEN_TYPE.ERROR,
      [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
        PERPS_EVENT_VALUE.SCREEN_NAME.CONNECTION_ERROR,
      [PERPS_EVENT_PROPERTY.ERROR_TYPE]: PERPS_EVENT_VALUE.ERROR_TYPE.NETWORK,
      [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
      [PERPS_EVENT_PROPERTY.RETRY_ATTEMPTS]: retryAttempts,
    },
    resetConditions: [retryAttempts > 0],
  });

  // Filter debug messages in production - show generic error message
  const shouldShowDebugDetails =
    __DEV__ &&
    (error?.toString().includes('Simulated') ||
      error?.toString().includes('Test') ||
      error?.toString().includes('Debug'));

  // Determine if back button should be shown
  const shouldShowBackButton = showBackButton || retryAttempts > 0;
  const handleGoBack = () => {
    // Navigate back to the previous screen or wallet home
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If we can't go back, navigate to wallet home
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.WALLET.TAB_STACK_FLOW }],
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.errorContainer}>
        <Icon
          name={IconName.Warning}
          color={IconColor.Muted}
          size={IconSize.Xl}
          style={styles.errorIcon}
        />

        <Text
          variant={TextVariant.BodyMDMedium}
          color={TextColor.Default}
          style={styles.errorTitle}
        >
          {strings('perps.errors.connectionFailed.title')}
        </Text>

        {/* Only show debug details in development */}
        {shouldShowDebugDetails && (
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Muted}
            style={styles.debugMessage}
          >
            Debug: {error instanceof Error ? error.message : error}
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={
            isRetrying
              ? strings('perps.connection.retrying_connection')
              : strings('perps.errors.connectionFailed.retry')
          }
          onPress={() => {
            track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
              [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
                PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
              [PERPS_EVENT_PROPERTY.ACTION]:
                PERPS_EVENT_VALUE.ACTION.CONNECTION_RETRY,
              [PERPS_EVENT_PROPERTY.ATTEMPT_NUMBER]: retryAttempts + 1,
              [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
            });
            onRetry();
          }}
          loading={isRetrying}
          style={styles.retryButton}
        />

        {shouldShowBackButton && (
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('perps.errors.connectionFailed.go_back')}
            onPress={() => {
              track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
                [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
                  PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
                [PERPS_EVENT_PROPERTY.ACTION]:
                  PERPS_EVENT_VALUE.ACTION.CONNECTION_GO_BACK,
                [PERPS_EVENT_PROPERTY.ATTEMPT_NUMBER]: retryAttempts,
                [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
              });
              handleGoBack();
            }}
            style={styles.backButton}
          />
        )}
      </View>
    </View>
  );
};

export default PerpsConnectionErrorView;
