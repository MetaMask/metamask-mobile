import React, { useState, useEffect, useCallback } from 'react';
import { View, SafeAreaView } from 'react-native';

import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';

const TestForm = ({
  title,
  textFields,
  buttonLabel,
  callback,
  styles,
}: {
  title: string;
  textFields: {
    placeholder: string;
  }[];
  buttonLabel: string;
  callback:
    | ((...args: any[]) => Promise<unknown>)
    | ((...args: any[]) => unknown);
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
    const response = (await callback(...args)) as string;
    setResult(response);
  }, [callback, args]);

  return (
    <SafeAreaView style={styles.form}>
      <Text variant={TextVariant.HeadingSM} style={styles.formTitle}>
        {title}
      </Text>
      {textFields.map((textField, index) => (
        <View key={index} style={styles.input}>
          <TextField
            size={TextFieldSize.Sm}
            autoCorrect={false}
            autoComplete={'off'}
            placeholder={textField.placeholder}
            onChangeText={(value: string) => handleInputChange(index, value)}
          />
        </View>
      ))}
      <Text variant={TextVariant.BodyMDBold}>Response</Text>
      <Text variant={TextVariant.BodyMD}>{result}</Text>
      <Button
        variant={ButtonVariants.Primary}
        onPress={executeTest}
        label={buttonLabel}
        size={ButtonSize.Md}
        style={styles.button}
      />
    </SafeAreaView>
  );
};

export default TestForm;
