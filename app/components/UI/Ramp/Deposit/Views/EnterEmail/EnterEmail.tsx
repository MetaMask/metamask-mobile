import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './EnterEmail.styles';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import type {
  StackNavigationProp,
  StackScreenProps,
} from '@react-navigation/stack';
import type {
  NavigatableRootParamList,
  RootParamList,
} from '../../../../../../util/navigation/types';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../locales/i18n';
import TextField, {
  TextFieldSize,
} from '../../../../../../component-library/components/Form/TextField';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import { validateEmail } from '../../utils';
import DepositProgressBar from '../../components/DepositProgressBar/DepositProgressBar';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import PoweredByTransak from '../../components/PoweredByTransak';
import Logger from '../../../../../../util/Logger';
import useAnalytics from '../../../hooks/useAnalytics';

type EnterEmailProps = StackScreenProps<RootParamList, 'EnterEmail'>;

const EnterEmail = ({ route }: EnterEmailProps) => {
  const navigation =
    useNavigation<
      StackNavigationProp<NavigatableRootParamList, 'EnterEmail'>
    >();
  const redirectToRootAfterAuth = route.params?.redirectToRootAfterAuth;
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState(false);

  const { styles, theme } = useStyles(styleSheet, {});

  const trackEvent = useAnalytics();

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.enter_email.navbar_title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  const [, submitEmail] = useDepositSdkMethod(
    { method: 'sendUserOtp', onMount: false, throws: true },
    email,
  );

  const emailInputRef = useRef<TextInput>(null);

  const handleTextChange = useCallback(
    (text: string) => {
      setEmail(text);
      setValidationError(false);
      setError(null);
    },
    [setEmail, setValidationError, setError],
  );

  const handleSubmit = useCallback(async () => {
    try {
      setIsLoading(true);

      if (validateEmail(email)) {
        setValidationError(false);
        const otpResponse = await submitEmail();

        if (!otpResponse?.stateToken) {
          throw new Error('State token is required for OTP verification');
        }

        trackEvent('RAMPS_EMAIL_SUBMITTED', {
          ramp_type: 'DEPOSIT',
        });
        navigation.navigate('OtpCode', {
          email,
          stateToken: otpResponse.stateToken,
          redirectToRootAfterAuth,
        });
      } else {
        setValidationError(true);
      }
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : strings('deposit.enter_email.error'),
      );
      Logger.error(e as Error, 'Error submitting email');
    } finally {
      setIsLoading(false);
    }
  }, [email, navigation, submitEmail, trackEvent, redirectToRootAfterAuth]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <DepositProgressBar steps={4} currentStep={0} />
          <View style={styles.contentContainer}>
            <Text variant={TextVariant.HeadingLG} style={styles.title}>
              {strings('deposit.enter_email.title')}
            </Text>
            <Text style={styles.description}>
              {strings('deposit.enter_email.description')}
            </Text>

            <TextField
              autoComplete="email"
              keyboardType="email-address"
              size={TextFieldSize.Lg}
              placeholder={strings('deposit.enter_email.input_placeholder')}
              placeholderTextColor={theme.colors.text.muted}
              returnKeyType={'done'}
              onSubmitEditing={handleSubmit}
              autoCapitalize="none"
              ref={emailInputRef}
              onChangeText={handleTextChange}
              value={email}
              keyboardAppearance={theme.themeAppearance}
              isDisabled={isLoading}
            />

            {validationError && (
              <Text style={styles.error}>
                {strings('deposit.enter_email.validation_error')}
              </Text>
            )}

            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content style={styles.footerContent}>
          <Button
            size={ButtonSize.Lg}
            onPress={handleSubmit}
            label={strings('deposit.enter_email.submit_button')}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            loading={isLoading}
            isDisabled={isLoading}
          />
          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default EnterEmail;
