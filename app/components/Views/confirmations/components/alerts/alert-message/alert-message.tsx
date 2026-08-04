import React, { ReactElement } from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './alert-message.styles';
import { Text, TextVariant } from '@metamask/design-system-react-native';

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
          <Text variant={TextVariant.BodySm} style={styles.message}>
            {alertMessage}
          </Text>
        )}
      </View>
    </View>
  );
});
