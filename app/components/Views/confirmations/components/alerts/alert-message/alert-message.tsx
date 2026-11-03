import React, { ReactElement } from 'react';
import { Text, TextColor } from '@metamask/design-system-react-native';

export interface AlertMessageProps {
  content?: ReactElement;
  alertMessage: string | undefined;
}

export const AlertMessage: React.FC<AlertMessageProps> = React.memo((props) => {
  const { content, alertMessage } = props;

  if (content) {
    return content;
  }

  if (!alertMessage) {
    return null;
  }

  return (
    <Text
      color={TextColor.ErrorDefault}
      twClassName="text-center"
      testID="alert-message-banner"
    >
      {alertMessage}
    </Text>
  );
});
