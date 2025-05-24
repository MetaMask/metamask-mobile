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
import { getDepositNavbarOptions } from '../../../Navbar';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';

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
        { title: 'Enter six-digit code' },
        theme,
      ),
    );
  }, [navigation, theme]);

  const [value, setValue] = useState('');

  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT }) || null;
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  const {
    response,
    error,
    sdkMethod: submitCode,
    loading,
    // TODO: the email state must be hoisted so it can be accessed here
  } = useDepositSdkMethod('verifyUserOtp', [
    value,
    'george.weiler@consensys.net',
  ]);

  useEffect(() => {
    ref.current?.focus();
  }, [ref]);

  const handleSubmit = async () => {
    await submitCode();
    if (response && !error) {
      navigation.navigate(...createIdVerifyNavDetails());
    }
  };

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <Text>{strings('deposit.email_auth.code.description')}</Text>
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
            disabled={loading}
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
