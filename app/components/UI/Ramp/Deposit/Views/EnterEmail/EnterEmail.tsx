import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './EnterEmail.styles';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../locales/i18n';
import TextField, {
  TextFieldSize,
} from '../../../../../../component-library/components/Form/TextField';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import { createOtpCodeNavDetails } from '../OtpCode/OtpCode';
import { validateEmail } from '../../utils';
import DepositProgressBar from '../../components/DepositProgressBar/DepositProgressBar';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import PoweredByTransak from '../../components/PoweredByTransak';
import Logger from '../../../../../../util/Logger';
import useAnalytics from '../../../hooks/useAnalytics';

export interface EnterEmailParams {
  quote: BuyQuote;
  paymentMethodId: string;
  cryptoCurrencyChainId: string;
}

export const createEnterEmailNavDetails =
  createNavigationDetails<EnterEmailParams>(Routes.DEPOSIT.ENTER_EMAIL);

const EnterEmail = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState(false);
  const { quote, paymentMethodId, cryptoCurrencyChainId } =
    useParams<EnterEmailParams>();

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
        await submitEmail();
        trackEvent('RAMPS_EMAIL_SUBMITTED', {
          ramp_type: 'DEPOSIT',
        });
        navigation.navigate(
          ...createOtpCodeNavDetails({
            quote,
            email,
            paymentMethodId,
            cryptoCurrencyChainId,
          }),
        );
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
  }, [
    email,
    navigation,
    submitEmail,
    quote,
    paymentMethodId,
    cryptoCurrencyChainId,
    trackEvent,
  ]);

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
