import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from '../../Deposit/Views/EnterEmail/EnterEmail.styles';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import TextField from '../../../../../component-library/components/Form/TextField';
import { getDepositNavbarOptions } from '../../../Navbar';
import { createV2OtpCodeNavDetails } from './OtpCode';
import { validateEmail } from '../../Deposit/utils';
import DepositProgressBar from '../../Deposit/components/DepositProgressBar/DepositProgressBar';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import PoweredByTransak from '../../Deposit/components/PoweredByTransak';
import Logger from '../../../../../util/Logger';
import useAnalytics from '../../hooks/useAnalytics';
import { useTransakController } from '../../hooks/useTransakController';
import { parseUserFacingError } from '../../utils/parseUserFacingError';

export interface V2EnterEmailParams {
  amount?: string;
  currency?: string;
  assetId?: string;
}

export const createV2EnterEmailNavDetails =
  createNavigationDetails<V2EnterEmailParams>(Routes.RAMP.ENTER_EMAIL);

const V2EnterEmail = () => {
  const navigation = useNavigation();
  const params = useParams<V2EnterEmailParams>();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState(false);

  const { styles, theme } = useStyles(styleSheet, {});
  const trackEvent = useAnalytics();
  const { sendUserOtp } = useTransakController();

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.enter_email.navbar_title') },
        theme,
      ),
    );
  }, [navigation, theme]);

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
        const otpResponse = await sendUserOtp(email);

        if (!otpResponse?.stateToken) {
          throw new Error('State token is required for OTP verification');
        }

        trackEvent('RAMPS_EMAIL_SUBMITTED', {
          ramp_type: 'DEPOSIT',
        });
        navigation.navigate(
          ...createV2OtpCodeNavDetails({
            email,
            stateToken: otpResponse.stateToken,
            amount: params?.amount,
            currency: params?.currency,
            assetId: params?.assetId,
          }),
        );
      } else {
        setValidationError(true);
      }
    } catch (e) {
      setError(parseUserFacingError(e, strings('deposit.enter_email.error')));
      Logger.error(e as Error, 'Error submitting email');
    } finally {
      setIsLoading(false);
    }
  }, [email, navigation, sendUserOtp, trackEvent, params]);

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
              placeholder={strings('deposit.enter_email.input_placeholder')}
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

export default V2EnterEmail;
