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
import ScreenView from '../../../../Base/ScreenView';
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
    <ScreenView>
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon
            name={IconName.Details}
            color={IconColor.Muted}
            size={IconSize.Xl}
            style={styles.errorIcon}
          />

          <Text
            variant={TextVariant.HeadingLG}
            color={TextColor.Error}
            style={styles.errorTitle}
          >
            {strings('perps.errors.connectionFailed.title')}
          </Text>

          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Muted}
            style={styles.errorMessage}
          >
            {strings('perps.errors.connectionFailed.description')}
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
            onPress={onRetry}
            loading={isRetrying}
            style={styles.retryButton}
          />

          {shouldShowBackButton && (
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('navigation.go_back')}
              onPress={handleGoBack}
              style={styles.backButton}
            />
          )}
        </View>
      </View>
    </ScreenView>
  );
};

export default PerpsConnectionErrorView;
