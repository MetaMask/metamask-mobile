import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import styleSheet from './PredictOffline.styles';

interface PredictOfflineProps {
  /**
   * Optional callback when retry button is pressed
   */
  onRetry?: () => void;
  /**
   * TestID for the component
   */
  testID?: string;
}

const PredictOffline: React.FC<PredictOfflineProps> = ({
  onRetry,
  testID = 'predict-error-state',
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box testID={testID} style={styles.errorState}>
      <Icon
        name={IconName.Warning}
        size={IconSize.Xl}
        color={IconColor.Muted}
        style={styles.errorStateIcon}
      />
      <Text
        variant={TextVariant.HeadingMd}
        twClassName="text-default"
        style={styles.errorStateTitle}
      >
        {strings('predict.error.title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-alternative"
        style={styles.errorStateDescription}
      >
        {strings('predict.error.description')}
      </Text>
      {onRetry && (
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          onPress={onRetry}
          label={strings('predict.error.retry')}
          style={styles.errorStateButton}
        />
      )}
    </Box>
  );
};

export default PredictOffline;
