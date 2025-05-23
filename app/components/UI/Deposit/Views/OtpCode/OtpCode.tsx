import React, { useState, useEffect } from 'react';
import { TextInput, View } from 'react-native';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './OtpCode.styles';
import StyledButton from '../../../StyledButton';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';

export const createIdVerifyNavDetails = createNavigationDetails(
  Routes.DEPOSIT.ID_VERIFY,
);

// Mock async SDK functions
// TODO: Replace with actual SDK functions to submit email and code to Transak
const submitCode = (code: string): Promise<void> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (code.length === 6) {
        resolve();
      } else {
        reject(new Error('Invalid code'));
      }
    }, 2000);
  });

const CELL_COUNT = 6;

const OtpCode = () => {
  const navigation = useNavigation();
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});

  const [value, setValue] = useState('');

  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT }) || null;
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [ref]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await submitCode(value);
      navigation.navigate(...createIdVerifyNavDetails());
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <Text>Enter the 6 digit code that we sent to your email</Text>
          <CodeField
            ref={ref as React.RefObject<TextInput>}
            {...props}
            value={value}
            onChangeText={setValue}
            cellCount={CELL_COUNT}
            rootStyle={styles.codeFieldRoot}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            renderCell={({ index, symbol, isFocused }) => (
              <View
                onLayout={getCellOnLayoutHandler(index)}
                key={index}
                style={[styles.cellRoot, isFocused && styles.focusCell]}
              >
                <Text style={styles.cellText}>
                  {symbol || (isFocused ? <Cursor /> : null)}
                </Text>
              </View>
            )}
          />

          {error && (
            <Text style={{ color: colors.error.default }}>{error}</Text>
          )}
        </ScreenLayout.Content>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <StyledButton
            type="confirm"
            onPress={handleSubmit}
            accessibilityRole="button"
            accessible
          >
            {loading
              ? strings('deposit.email_auth.code.loading')
              : strings('deposit.email_auth.code.submit_button')}
          </StyledButton>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default OtpCode;
