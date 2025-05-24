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
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import { createOtpCodeNavDetails } from '../OtpCode/OtpCode';

export const createEnterEmailNavDetails = createNavigationDetails(
  Routes.DEPOSIT.ENTER_EMAIL,
);

const EnterEmail = () => {
  const navigation = useNavigation();
  const [value, setValue] = useState('');

  const { styles, theme } = useStyles(styleSheet, {});

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(navigation, { title: 'Enter email' }, theme),
    );
  }, [navigation, theme]);

  const { error, sdkMethod: submitEmail, loading } = useDepositSdkMethod();

  const emailInputRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    try {
      await submitEmail(value);
      navigation.navigate(...createOtpCodeNavDetails());
    } catch (e) {
      console.error('Error submitting email');
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
