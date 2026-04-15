import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import styleSheet from '../../Deposit/Views/KycProcessing/KycProcessing.styles';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import DepositProgressBar from '../../Deposit/components/DepositProgressBar';
import { useStyles } from '../../../../hooks/useStyles';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../Navbar';
import { strings } from '../../../../../../locales/i18n';
import {
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import PoweredByTransak from '../../Deposit/components/PoweredByTransak';
import { KycStatus } from '../../Deposit/constants';
import Logger from '../../../../../util/Logger';
import useAnalytics from '../../hooks/useAnalytics';
import { useTransakController } from '../../hooks/useTransakController';
import { useTransakRouting } from '../../hooks/useTransakRouting';
import type { TransakUserDetails } from '@metamask/ramps-controller';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import { KYC_PROCESSING_TEST_IDS } from './KycProcessing.testIds';

const V2KycProcessing = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const trackEvent = useAnalytics();

  const {
    getAdditionalRequirements,
    getUserDetails,
    buyQuote: quote,
  } = useTransakController();
  const { routeAfterAuthentication } = useTransakRouting({
    screenLocation: 'V2 KycProcessing Screen',
  });

  const [kycForms, setKycForms] = useState<{
    formsRequired: { type: string }[];
  } | null>(null);
  const [kycFormsError, setKycFormsError] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<TransakUserDetails | null>(
    null,
  );
  const [userDetailsError, setUserDetailsError] = useState<string | null>(null);
  const [isContinueLoading, setIsContinueLoading] = useState(false);
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

  const quoteId = quote?.quoteId;

  // Fetch KYC forms when the screen gains focus.
  // When behind the Checkout webview (via navigateToKycWebviewCallback), this
  // fires once the webview is dismissed. When navigated to directly (e.g.
  // SUBMITTED status), it fires immediately on mount.
  useFocusEffect(
    useCallback(() => {
      if (!quoteId) return;
      setKycFormsError(null);
      const fetchKycForms = async () => {
        try {
          const result = await getAdditionalRequirements(quoteId);
          setKycForms(result);
        } catch (err) {
          setKycFormsError(
            parseUserFacingError(
              err,
              strings('deposit.kyc_processing.error_description'),
            ),
          );
        }
      };
      fetchKycForms();
    }, [getAdditionalRequirements, quoteId]),
  );

  const fetchUserDetailsCallback = useCallback(async () => {
    try {
      const result = await getUserDetails();
      setUserDetails(result);
      return result;
    } catch (err) {
      setUserDetailsError(
        parseUserFacingError(
          err,
          strings('deposit.kyc_processing.error_description'),
        ),
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
    if (!quote) return;
    setIsContinueLoading(true);
    try {
      await routeAfterAuthentication(quote);
    } catch (routeError) {
      Logger.error(routeError as Error, {
        message: 'V2KycProcessing::handleContinue error',
        quote,
      });
    } finally {
      setIsContinueLoading(false);
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
                color={IconColor.ErrorDefault}
              />
              <Text variant={TextVariant.BodyMd} style={styles.heading}>
                {strings('deposit.kyc_processing.error_heading')}
              </Text>
              <Text variant={TextVariant.BodyMd} style={styles.description}>
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
              variant={ButtonVariant.Primary}
              isFullWidth
              isLoading={isContinueLoading}
            >
              {strings('deposit.kyc_processing.error_button')}
            </Button>
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
                  color={IconColor.SuccessDefault}
                />
              </View>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Bold}
                style={styles.heading}
              >
                {strings('deposit.kyc_processing.success_heading')}
              </Text>
              <Text variant={TextVariant.BodyMd} style={styles.description}>
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
              variant={ButtonVariant.Primary}
              isFullWidth
              isLoading={isContinueLoading}
            >
              {strings('deposit.kyc_processing.success_button')}
            </Button>
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
              testID={KYC_PROCESSING_TEST_IDS.ACTIVITY_INDICATOR}
            />
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              style={styles.heading}
            >
              {strings('deposit.kyc_processing.heading')}
            </Text>
            <Text variant={TextVariant.BodyMd} style={styles.description}>
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
