import React, { ReactElement } from 'react';
import {
  HelpText,
  HelpTextSeverity,
} from '@metamask/design-system-react-native';

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
    <HelpText
      severity={HelpTextSeverity.Danger}
      twClassName="text-center"
      testID="alert-message-banner"
    >
      {alertMessage}
    </HelpText>
  );
});
