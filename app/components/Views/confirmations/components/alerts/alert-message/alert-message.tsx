import React, { ReactElement } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import {
  HelpText,
  HelpTextSeverity,
} from '@metamask/design-system-react-native';

export interface AlertMessageProps {
  content?: ReactElement;
  alertMessage: string | undefined;
  /** Overrides the help-text size. HelpText itself is fixed at body-sm. */
  style?: StyleProp<TextStyle>;
}

export const AlertMessage: React.FC<AlertMessageProps> = React.memo((props) => {
  const { content, alertMessage, style } = props;

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
      style={style}
    >
      {alertMessage}
    </HelpText>
  );
});
