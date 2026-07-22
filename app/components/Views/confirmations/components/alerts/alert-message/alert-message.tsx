import React, { ReactElement } from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './alert-message.styles';

export interface AlertMessageProps {
  content?: ReactElement;
  alertMessage: string | undefined;
}

export const AlertMessage: React.FC<AlertMessageProps> = React.memo((props) => {
  const { content, alertMessage } = props;
  const { styles } = useStyles(styleSheet, {});

  if (!content && !alertMessage) {
    return null;
  }

  return (
    <View style={styles.container} testID="alert-message-banner">
      <View style={styles.border} />
      <View style={styles.content}>
        {content ?? (
          <Text variant={TextVariant.BodySM} style={styles.message}>
            {alertMessage}
          </Text>
        )}
      </View>
    </View>
  );
});
