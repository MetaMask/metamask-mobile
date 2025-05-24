import React, { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './EnterEmail.styles';
import StyledButton from '../../../StyledButton';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Label from '../../../../../component-library/components/Form/Label';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import Row from '../../..//Ramp/components/Row';
import { getDepositNavbarOptions } from '../../../Navbar';

export const createOtpCodeNavDetails = createNavigationDetails(
  Routes.DEPOSIT.OTP_CODE,
);

// Mock async SDK functions
// TODO: Replace with actual SDK functions to submit email and code to Transak
const submitEmail = (email: string): Promise<void> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email.includes('@')) {
        resolve();
      } else {
        reject(new Error('Invalid email address'));
      }
    }, 2000);
  });

const EnterEmail = () => {
  const navigation = useNavigation();
  const [value, setValue] = useState('');

  const { styles, theme } = useStyles(styleSheet, {});

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(navigation, { title: 'Enter email' }, theme),
    );
  }, [navigation, theme]);

  const emailInputRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await submitEmail(value);
      navigation.navigate(...createOtpCodeNavDetails());
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
          <Row style={styles.subtitle}>
            <Text>{strings('deposit.email_auth.email.description')}</Text>
          </Row>

          <View style={styles.field}>
            <Label variant={TextVariant.HeadingSMRegular} style={styles.label}>
              {strings('deposit.email_auth.email.input_label')}
            </Label>
            <TextField
              size={TextFieldSize.Lg}
              placeholder={strings(
                'deposit.email_auth.email.input_placeholder',
              )}
              placeholderTextColor={theme.colors.text.muted}
              returnKeyType={'done'}
              autoCapitalize="none"
              ref={emailInputRef}
              onChangeText={setValue}
              value={value}
              keyboardAppearance={theme.themeAppearance}
            />
            {error && (
              <Text style={{ color: theme.colors.error.default }}>{error}</Text>
            )}
          </View>
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
              ? strings('deposit.email_auth.email.loading')
              : strings('deposit.email_auth.email.submit_button')}
          </StyledButton>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default EnterEmail;
