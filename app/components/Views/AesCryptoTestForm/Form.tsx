import React, { useState, useEffect, useCallback } from 'react';
import { View, Keyboard, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ClipboardText from './Clipboard';
import {
  Text,
  TextVariant,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';

const TestForm = ({
  title,
  textFields,
  buttonLabel,
  callback,
  callbackTestId,
  responseTestId,
  responseTextTestId,
  styles,
}: {
  title: string;
  textFields: {
    placeholder: string;
    testId: string;
  }[];
  buttonLabel: string;
  callback: // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | ((...args: any[]) => Promise<unknown>)
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | ((...args: any[]) => unknown);
  callbackTestId: string;
  responseTestId: string;
  responseTextTestId?: string;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: any;
}) => {
  const [result, setResult] = useState('');
  const [args, setArgs] = useState<string[]>([]);

  useEffect(() => {
    setArgs(new Array(textFields.length).fill(''));
  }, [textFields]);

  const handleInputChange = useCallback(
    (index: number, value: string) => {
      const newArgs = [...args];
      newArgs[index] = value;
      setArgs(newArgs);
    },
    [args],
  );

  const executeTest = useCallback(async () => {
    const response = (await callback(args)) as string;
    setResult(response);
    Keyboard.dismiss();
  }, [callback, args]);

  return (
    <SafeAreaView style={styles.form}>
      <Text variant={TextVariant.HeadingSm} style={styles.formTitle}>
        {title}
      </Text>
      {textFields.map((textField, index) => (
        <View key={index} style={styles.input}>
          <TextInput
            autoCorrect={false}
            autoComplete={'off'}
            placeholder={textField.placeholder}
            onChangeText={(value: string) => handleInputChange(index, value)}
            testID={textField.testId}
            autoFocus={false}
            style={styles.textInput}
          />
        </View>
      ))}
      {result && (
        <>
          <Text
            variant={TextVariant.BodyMd}
            testID={responseTextTestId}
            fontWeight={FontWeight.Bold}
          >
            Response
          </Text>
          <ClipboardText
            text={result}
            styles={styles}
            testID={responseTestId}
          />
        </>
      )}
      <Button
        variant={ButtonVariant.Primary}
        onPress={executeTest}
        size={ButtonSize.Md}
        style={styles.button}
        testID={callbackTestId}
      >
        {buttonLabel}
      </Button>
    </SafeAreaView>
  );
};

export default TestForm;
