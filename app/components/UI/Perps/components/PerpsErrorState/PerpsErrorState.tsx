import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
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
import styleSheet from './PerpsErrorState.styles';

export enum PerpsErrorType {
  CONNECTION_FAILED = 'connection_failed',
  NETWORK_ERROR = 'network_error',
  UNKNOWN = 'unknown',
}

interface PerpsErrorStateProps {
  errorType?: PerpsErrorType;
  onRetry?: () => void;
  testID?: string;
}

/**
 * PerpsErrorState - Error state component for Perps tab
 * Displays appropriate error messages and actions based on error type
 */
const PerpsErrorState: React.FC<PerpsErrorStateProps> = ({
  errorType = PerpsErrorType.UNKNOWN,
  onRetry,
  testID = 'perps-error-state',
}) => {
  const { styles } = useStyles(styleSheet, {});

  const getErrorContent = () => {
    switch (errorType) {
      case PerpsErrorType.CONNECTION_FAILED:
        return {
          icon: IconName.Wifi,
          title: strings('perps.errors.connectionFailed.title'),
          description: strings('perps.errors.connectionFailed.description'),
          primaryAction: {
            label: strings('perps.errors.connectionFailed.retry'),
            onPress: onRetry,
          },
        };
      case PerpsErrorType.NETWORK_ERROR:
        return {
          icon: IconName.Global,
          title: strings('perps.errors.networkError.title'),
          description: strings('perps.errors.networkError.description'),
          primaryAction: {
            label: strings('perps.errors.networkError.retry'),
            onPress: onRetry,
          },
        };
      default:
        return {
          icon: IconName.Warning,
          title: strings('perps.errors.unknown.title'),
          description: strings('perps.errors.unknown.description'),
          primaryAction: onRetry
            ? {
                label: strings('perps.errors.unknown.retry'),
                onPress: onRetry,
              }
            : undefined,
        };
    }
  };

  const errorContent = getErrorContent();
  const iconSize = 48 as unknown as IconSize;

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.content}>
        <Icon
          name={errorContent.icon}
          color={IconColor.Muted}
          size={iconSize}
          style={styles.icon}
        />
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.title}
        >
          {errorContent.title}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Muted}
          style={styles.description}
        >
          {errorContent.description}
        </Text>
        {errorContent.primaryAction?.onPress && (
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            label={errorContent.primaryAction.label}
            onPress={errorContent.primaryAction.onPress}
            style={styles.button}
            width={ButtonWidthTypes.Full}
          />
        )}
      </View>
    </View>
  );
};

export default PerpsErrorState;
