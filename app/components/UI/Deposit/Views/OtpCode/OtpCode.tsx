import React, { useState, useEffect, useCallback } from 'react';
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
import { getDepositNavbarOptions } from '../../../Navbar';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import { useDepositSDK } from '../../sdk';

// TODO: Move this to the ID Verify component when it is implemented
export const createIdVerifyNavDetails = createNavigationDetails(
  Routes.DEPOSIT.ID_VERIFY,
);

export const createOtpCodeNavDetails = createNavigationDetails(
  Routes.DEPOSIT.OTP_CODE,
);

const CELL_COUNT = 6;

const OtpCode = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.otp_code.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  const [value, setValue] = useState('');
  const { email } = useDepositSDK();

  const inputRef = useBlurOnFulfill({ value, cellCount: CELL_COUNT }) || null;
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  const {
    error,
    sdkMethod: submitCode,
    loading,
  } = useDepositSdkMethod('verifyUserOtp', value, email);

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  const handleSubmit = useCallback(async () => {
    if (!loading && value.length === CELL_COUNT) {
      await submitCode();
      if (!error) {
        navigation.navigate(...createIdVerifyNavDetails());
      }
    }
  }, [error, loading, navigation, submitCode, value.length]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <Text>{strings('deposit.otp_code.description', { email })}</Text>
          <CodeField
            testID="otp-code-input"
            ref={inputRef as React.RefObject<TextInput>}
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
            <Text style={{ color: theme.colors.error.default }}>{error}</Text>
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
            disabled={loading || value.length !== CELL_COUNT}
          >
            {loading
              ? strings('deposit.otp_code.loading')
              : strings('deposit.otp_code.submit_button')}
          </StyledButton>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default OtpCode;
