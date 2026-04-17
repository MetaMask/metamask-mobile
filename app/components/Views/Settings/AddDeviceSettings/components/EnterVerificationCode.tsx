import React, { useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  TextField,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';

const CODE_LENGTH = 6;

const EnterVerificationCode = () => {
  const navigation = useNavigation();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>(Array(CODE_LENGTH).fill(null));

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const updated = [...code];
    updated[index] = digit;
    setCode(updated);

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      const updated = [...code];
      updated[index - 1] = '';
      setCode(updated);
      inputRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (code.every((d) => d.length === 1)) {
      navigation.goBack();
    }
  }, [code, navigation]);

  return (
    <Box twClassName="p-4 pt-0 flex-1 flex-col gap-6">
      <Box twClassName="flex-col gap-2">
        <Text
          variant={TextVariant.HeadingLg}
          twClassName="text-[26px]"
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Bold}
        >
          {strings('app_settings.add_device.enter_verification_code')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('app_settings.add_device.enter_verification_code_desc')}
        </Text>
      </Box>
      <Box twClassName="flex-row gap-2 justify-between px-6">
        {code.map((digit, index) => (
          <TextField
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref as unknown as TextInput;
            }}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={({ nativeEvent }) =>
              handleKeyPress(nativeEvent.key, index)
            }
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            twClassName="w-12 h-[54px] p-0 rounded-lg"
            autoFocus={index === 0}
            selectTextOnFocus
          />
        ))}
      </Box>
    </Box>
  );
};

export default EnterVerificationCode;
