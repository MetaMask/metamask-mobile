import React from 'react';
import { View, ViewStyle } from 'react-native';
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import HelpText, {
  HelpTextSeverity,
} from '../../../../component-library/components/Form/HelpText';

interface LoginErrorMessageProps {
  error: string | null;
  testID: string;
  style?: ViewStyle;
}

export const LoginErrorMessage: React.FC<LoginErrorMessageProps> = ({
  error,
  testID,
  style,
}) => (
  <View style={style}>
    {!!error && (
      <HelpText
        severity={HelpTextSeverity.Error}
        variant={TextVariant.BodyMD}
        testID={testID}
      >
        {error}
      </HelpText>
    )}
  </View>
);
