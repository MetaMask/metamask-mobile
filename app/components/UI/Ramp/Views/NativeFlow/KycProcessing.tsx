import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import styleSheet from '../../Deposit/Views/KycProcessing/KycProcessing.styles';
import { useNavigation } from '@react-navigation/native';
import DepositProgressBar from '../../Deposit/components/DepositProgressBar';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useStyles } from '../../../../../component-library/hooks';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../Navbar';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import PoweredByTransak from '../../Deposit/components/PoweredByTransak';
import { KycStatus } from '../../Deposit/constants';
import Logger from '../../../../../util/Logger';
import useAnalytics from '../../hooks/useAnalytics';
import { useTransakController } from '../../hooks/useTransakController';
import { useTransakRouting } from '../../hooks/useTransakRouting';
import type { TransakBuyQuote, TransakUserDetails } from '@metamask/ramps-controller';

interface V2KycProcessingParams {
  quote: TransakBuyQuote;
}

const V2KycProcessing = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { quote } = useParams<V2KycProcessingParams>();
  const trackEvent = useAnalytics();

  const { getAdditionalRequirements, getUserDetails } = useTransakController();
  const { routeAfterAuthentication } = useTransakRouting({
    screenLocation: 'V2 KycProcessing Screen',
  });

  const [kycForms, setKycForms] = useState<{ formsRequired: { type: string }[] } | null>(null);
  const [kycFormsError, setKycFormsError] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<TransakUserDetails | null>(null);
  const [userDetailsError, setUserDetailsError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.kyc_processing.navbar_title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  useEffect(() => {
    const fetchKycForms = async () => {
      try {
        const result = await getAdditionalRequirements(quote.quoteId);
        setKycForms(result);
      } catch (err) {
        setKycFormsError(
          err instanceof Error ? err.message : 'Failed to fetch KYC forms',
        );
      }
    };
    fetchKycForms();
  }, [getAdditionalRequirements, quote.quoteId]);

  const fetchUserDetailsCallback = useCallback(async () => {
    try {
      const result = await getUserDetails();
      setUserDetails(result);
      return result;
    } catch (err) {
      setUserDetailsError(
        err instanceof Error ? err.message : 'Failed to fetch user details',
      );
      return null;
    }
  }, [getUserDetails]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    fetchUserDetailsCallback();
    pollingRef.current = setInterval(() => {
      fetchUserDetailsCallback();
    }, 10000);
  }, [fetchUserDetailsCallback, stopPolling]);

  useEffect(() => {
    if (kycForms?.formsRequired.length === 0) {
      startPolling();
    }
    return () => stopPolling();
  }, [kycForms, startPolling, stopPolling]);

  const kycStatus = userDetails?.kyc?.status;

  useEffect(() => {
    if (
      kycStatus &&
      kycStatus !== KycStatus.NOT_SUBMITTED &&
      kycStatus !== KycStatus.SUBMITTED
    ) {
      stopPolling();
    }
  }, [kycStatus, stopPolling]);

  const handleContinue = useCallback(async () => {
    try {
      await routeAfterAuthentication(quote);
    } catch (routeError) {
      Logger.error(routeError as Error, {
        message: 'V2KycProcessing::handleContinue error',
        quote,
      });
    }
  }, [routeAfterAuthentication, quote]);

  const error = userDetailsError || kycFormsError;
  const hasPendingForms = kycForms && kycForms.formsRequired.length > 0;

  useEffect(() => {
    if (kycStatus === KycStatus.REJECTED) {
      trackEvent('RAMPS_KYC_APPLICATION_FAILED', {
        ramp_type: 'DEPOSIT',
        kyc_type: userDetails?.kyc?.type || '',
      });
    } else if (kycStatus === KycStatus.APPROVED) {
      trackEvent('RAMPS_KYC_APPLICATION_APPROVED', {
        ramp_type: 'DEPOSIT',
        kyc_type: userDetails?.kyc?.type || '',
      });
    }
  }, [kycStatus, trackEvent, userDetails?.kyc?.type]);

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
                {error || strings('deposit.kyc_processing.error_description')}
              </Text>
            </View>
          </ScreenLayout.Content>
        </ScreenLayout.Body>
        <ScreenLayout.Footer>
          <ScreenLayout.Content style={styles.footerContent}>
            <Button
              size={ButtonSize.Lg}
              onPress={handleContinue}
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

export default V2KycProcessing;
