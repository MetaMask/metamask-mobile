import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './EnterEmail.styles';
import StyledButton from '../../../../StyledButton';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../locales/i18n';
import Label from '../../../../../../component-library/components/Form/Label';
import TextField, {
  TextFieldSize,
} from '../../../../../../component-library/components/Form/TextField';
import Row from '../../../Aggregator/components/Row';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import { createOtpCodeNavDetails } from '../OtpCode/OtpCode';
import { validateEmail } from '../../utils';
import { useDepositSDK } from '../../sdk';
import DepositProgressBar from '../../components/DepositProgressBar/DepositProgressBar';
import { BuyQuote } from '@consensys/native-ramps-sdk';

export interface EnterEmailParams {
  quote: BuyQuote;
}

export const createEnterEmailNavDetails =
  createNavigationDetails<EnterEmailParams>(Routes.DEPOSIT.ENTER_EMAIL);

const EnterEmail = () => {
  const navigation = useNavigation();
  const { email, setEmail } = useDepositSDK();
  const [validationError, setValidationError] = useState(false);
  const { quote } = useParams<EnterEmailParams>();

  const { styles, theme } = useStyles(styleSheet, {});

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.enter_email.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  const [{ error, isFetching: loading }, submitEmail] = useDepositSdkMethod(
    { method: 'sendUserOtp', onMount: false },
    email,
  );

  const emailInputRef = useRef<TextInput>(null);

  const handleSubmit = useCallback(async () => {
    try {
      if (validateEmail(email)) {
        setValidationError(false);
        await submitEmail();

        if (!error) {
          navigation.navigate(...createOtpCodeNavDetails({ quote }));
        }
      } else {
        setValidationError(true);
      }
    } catch (e) {
      console.error('Error submitting email');
    }
  }, [email, error, navigation, submitEmail, quote]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <DepositProgressBar steps={4} currentStep={0} />
          <Row style={styles.subtitle}>
            <Text>{strings('deposit.enter_email.description')}</Text>
          </Row>

          <View style={styles.field}>
            <Label variant={TextVariant.HeadingSMRegular} style={styles.label}>
              {strings('deposit.enter_email.input_label')}
            </Label>
            <TextField
              size={TextFieldSize.Lg}
              placeholder={strings('deposit.enter_email.input_placeholder')}
              placeholderTextColor={theme.colors.text.muted}
              returnKeyType={'done'}
              autoCapitalize="none"
              ref={emailInputRef}
              onChangeText={setEmail}
              value={email}
              keyboardAppearance={theme.themeAppearance}
              isDisabled={loading}
            />
            {validationError && (
              <Text style={{ color: theme.colors.error.default }}>
                {strings('deposit.enter_email.validation_error')}
              </Text>
            )}

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
              ? strings('deposit.enter_email.loading')
              : strings('deposit.enter_email.submit_button')}
          </StyledButton>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default EnterEmail;
