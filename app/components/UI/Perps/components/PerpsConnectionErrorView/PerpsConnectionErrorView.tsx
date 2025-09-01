import React from 'react';
import { View } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import ScreenView from '../../../../Base/ScreenView';
import { createStyles } from './PerpsConnectionErrorView.styles';

interface PerpsConnectionErrorViewProps {
  error: string | Error;
  onRetry: () => void;
  isRetrying?: boolean;
}

const PerpsConnectionErrorView: React.FC<PerpsConnectionErrorViewProps> = ({
  error,
  onRetry,
  isRetrying = false,
}) => {
  const { styles } = useStyles(createStyles, {});

  return (
    <ScreenView>
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text
            variant={TextVariant.HeadingLG}
            color={TextColor.Error}
            style={styles.errorTitle}
          >
            {strings('perps.connection.failed')}
          </Text>

          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Muted}
            style={styles.errorMessage}
          >
            {strings('perps.connection.error_message')}
          </Text>

          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Muted}
            style={styles.errorMessage}
          >
            {error instanceof Error ? error.message : error}
          </Text>
        </View>

        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={
            isRetrying
              ? strings('perps.connection.retrying_connection')
              : strings('perps.connection.retry_connection')
          }
          onPress={onRetry}
          loading={isRetrying}
          style={styles.retryButton}
        />
      </View>
    </ScreenView>
  );
};

export default PerpsConnectionErrorView;
