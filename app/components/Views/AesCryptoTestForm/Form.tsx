import React, { useState, useEffect, useCallback } from 'react';
import { View, SafeAreaView, Keyboard, TextInput } from 'react-native';

import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import ClipboardText from './Clipboard';

const TestForm = ({
  title,
  textFields,
  buttonLabel,
  callback,
  callbackTestId,
  responseTestId,
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
      <Text variant={TextVariant.HeadingSM} style={styles.formTitle}>
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
          <Text variant={TextVariant.BodyMDBold}>Response</Text>
          <ClipboardText
            text={result}
            styles={styles}
            testID={responseTestId}
          />
        </>
      )}
      <Button
        variant={ButtonVariants.Primary}
        onPress={executeTest}
        label={buttonLabel}
        size={ButtonSize.Md}
        style={styles.button}
        testID={callbackTestId}
      />
    </SafeAreaView>
  );
};

export default TestForm;
