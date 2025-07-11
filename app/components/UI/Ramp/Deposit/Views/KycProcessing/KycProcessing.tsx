import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import styleSheet from './KycProcessing.styles';
import { useNavigation } from '@react-navigation/native';
import DepositProgressBar from '../../components/DepositProgressBar';
import useUserDetailsPolling from '../../hooks/useUserDetailsPolling';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../../component-library/hooks';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import { createVerifyIdentityNavDetails } from '../VerifyIdentity/VerifyIdentity';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import PoweredByTransak from '../../components/PoweredByTransak';
import { useDepositRouting } from '../../hooks/useDepositRouting';
import { getCryptoCurrencyFromTransakId } from '../../utils';
import { KycStatus } from '../../constants';
import Logger from '../../../../../../util/Logger';

export interface KycProcessingParams {
  quote: BuyQuote;
}

export const createKycProcessingNavDetails =
  createNavigationDetails<KycProcessingParams>(Routes.DEPOSIT.KYC_PROCESSING);

const KycProcessing = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { quote } = useParams<KycProcessingParams>();

  const cryptoCurrency = getCryptoCurrencyFromTransakId(quote.cryptoCurrency);

  const { handleApprovedKycFlow } = useDepositRouting({
    cryptoCurrencyChainId: cryptoCurrency?.chainId || '',
    paymentMethodId: quote.paymentMethod,
  });

  const [{ data: kycForms, error: kycFormsError }] = useDepositSdkMethod(
    {
      method: 'getKYCForms',
      onMount: true,
    },
    quote,
  );

  const {
    error: userDetailsError,
    userDetails,
    startPolling,
    stopPolling,
  } = useUserDetailsPolling(10000, false, 0);

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.kyc_processing.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  useEffect(() => {
    if (kycForms?.forms.length === 0) {
      startPolling();
    }

    return () => stopPolling();
  }, [kycForms, startPolling, stopPolling]);

  const handleRetryVerification = useCallback(() => {
    navigation.navigate(...createVerifyIdentityNavDetails({ quote }));
  }, [navigation, quote]);

  const handleContinue = useCallback(async () => {
    try {
      await handleApprovedKycFlow(quote);
    } catch (error) {
      Logger.error(error as Error, {
        message: 'KycProcessing::handleContinue error',
        quote,
      });
    }
  }, [handleApprovedKycFlow, quote]);

  const error = userDetailsError || kycFormsError;
  const hasPendingForms = kycForms && kycForms.forms.length > 0;
  const kycStatus = userDetails?.kyc?.l1?.status;

  if (error || kycStatus === KycStatus.REJECTED || hasPendingForms) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content grow>
            <DepositProgressBar steps={4} currentStep={3} />
            <View style={styles.container}>
              <Icon
                name={IconName.CircleX}
                size={IconSize.Xl}
                color={IconColor.Error}
              />

              <Text variant={TextVariant.BodyMD} style={styles.heading}>
                {strings('deposit.kyc_processing.error_heading')}
              </Text>
              <Text variant={TextVariant.BodyMD} style={styles.description}>
                {strings('deposit.kyc_processing.error_description')}
              </Text>
            </View>
          </ScreenLayout.Content>
        </ScreenLayout.Body>
        <ScreenLayout.Footer>
          <ScreenLayout.Content style={styles.footerContent}>
            <Button
              size={ButtonSize.Lg}
              onPress={handleRetryVerification}
              label={strings('deposit.kyc_processing.error_button')}
              variant={ButtonVariants.Primary}
              width={ButtonWidthTypes.Full}
            />
            <PoweredByTransak name="powered-by-transak-logo" />
          </ScreenLayout.Content>
        </ScreenLayout.Footer>
      </ScreenLayout>
    );
  }

  if (kycStatus === KycStatus.APPROVED) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content grow>
            <DepositProgressBar steps={4} currentStep={3} />
            <View style={styles.container}>
              <View style={styles.iconContainer}>
                <Icon
                  name={IconName.CheckBold}
                  size={IconSize.Xl}
                  color={IconColor.Success}
                />
              </View>

              <Text variant={TextVariant.BodyMDBold} style={styles.heading}>
                {strings('deposit.kyc_processing.success_heading')}
              </Text>

              <Text variant={TextVariant.BodyMD} style={styles.description}>
                {strings('deposit.kyc_processing.success_description')}
              </Text>
            </View>
          </ScreenLayout.Content>
        </ScreenLayout.Body>
        <ScreenLayout.Footer>
          <ScreenLayout.Content style={styles.footerContent}>
            <Button
              size={ButtonSize.Lg}
              onPress={handleContinue}
              label={strings('deposit.kyc_processing.success_button')}
              variant={ButtonVariants.Primary}
              width={ButtonWidthTypes.Full}
            />
            <PoweredByTransak name="powered-by-transak-logo" />
          </ScreenLayout.Content>
        </ScreenLayout.Footer>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <DepositProgressBar steps={4} currentStep={3} />
          <View style={styles.container}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary.default}
              testID="activity-indicator"
            />

            <Text variant={TextVariant.BodyMDBold} style={styles.heading}>
              {strings('deposit.kyc_processing.heading')}
            </Text>

            <Text variant={TextVariant.BodyMD} style={styles.description}>
              {strings('deposit.kyc_processing.description')}
            </Text>
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content style={styles.footerContent}>
          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default KycProcessing;
