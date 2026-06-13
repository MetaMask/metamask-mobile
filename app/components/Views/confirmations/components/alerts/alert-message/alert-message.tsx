import React from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './alert-message.styles';

export interface AlertMessageProps {
  alertMessage: string | undefined;
}

export const AlertMessage: React.FC<AlertMessageProps> = React.memo((props) => {
  const { alertMessage } = props;
  const { styles } = useStyles(styleSheet, {});

  if (!alertMessage) {
    return null;
  }

  return (
    <View style={styles.container} testID="alert-message-banner">
      <View style={styles.border} />
      <Text variant={TextVariant.BodySM} style={styles.message}>
        {alertMessage}
      </Text>
    </View>
  );
});
