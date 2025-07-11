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
import ScreenView from '../../../../Base/ScreenView';
import { createStyles } from './PerpsConnectionErrorView.styles';

interface PerpsConnectionErrorViewProps {
  error: string;
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
            Connection Failed
          </Text>

          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Muted}
            style={styles.errorMessage}
          >
            Unable to connect to Perps trading service.
          </Text>

          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Muted}
            style={styles.errorMessage}
          >
            {error}
          </Text>
        </View>

        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={isRetrying ? 'Connecting...' : 'Retry Connection'}
          onPress={onRetry}
          loading={isRetrying}
          style={styles.retryButton}
        />
      </View>
    </ScreenView>
  );
};

export default PerpsConnectionErrorView;
