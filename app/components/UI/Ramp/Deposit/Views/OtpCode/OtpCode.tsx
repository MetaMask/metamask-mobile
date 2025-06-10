import React, { useCallback, useState, useEffect } from 'react';
import { TextInput, View } from 'react-native';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './OtpCode.styles';
import StyledButton from '../../../../StyledButton';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../locales/i18n';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { getDepositNavbarOptions } from '../../../../Navbar';
import DepositProgressBar from '../../components/DepositProgressBar';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import { createVerifyIdentityNavDetails } from '../VerifyIdentity/VerifyIdentity';
import { useDepositSDK } from '../../sdk';
import { BuyQuote } from '@consensys/native-ramps-sdk';

export interface OtpCodeParams {
  quote: BuyQuote;
}

export const createOtpCodeNavDetails = createNavigationDetails<OtpCodeParams>(
  Routes.DEPOSIT.OTP_CODE,
);

const CELL_COUNT = 6;

const OtpCode = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { email, setAuthToken } = useDepositSDK();
  const { quote } = useParams<OtpCodeParams>();

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

  const inputRef = useBlurOnFulfill({ value, cellCount: CELL_COUNT }) || null;
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  const [{ error, isFetching: loading, data: response }, submitCode] =
    useDepositSdkMethod(
      { method: 'verifyUserOtp', onMount: false },
      email,
      value,
    );

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  useEffect(() => {
    const saveTokenAndNavigate = async () => {
      if (response) {
        try {
          await setAuthToken(response);
          navigation.navigate(...createVerifyIdentityNavDetails({ quote }));
        } catch (e) {
          console.error('Failed to store auth token:', e);
        }
      }
    };

    saveTokenAndNavigate();
  }, [response, setAuthToken, navigation, quote]);

  const handleSubmit = useCallback(async () => {
    if (!loading && value.length === CELL_COUNT) {
      await submitCode();
    }
  }, [loading, submitCode, value.length]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <DepositProgressBar steps={4} currentStep={1} />
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
