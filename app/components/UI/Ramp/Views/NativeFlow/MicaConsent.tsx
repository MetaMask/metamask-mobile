/**
 * One-time MiCA consent for existing EEA users. Displays user data (read-only)
 * and requires acceptance of data processing consent and Terms/Privacy Policy.
 */

import React, { useCallback, useState } from 'react';
import { View, Linking } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { useStyles } from '../../../../hooks/useStyles';
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { useTransakRouting } from '../../hooks/useTransakRouting';
import PoweredByTransak from '../../components/PoweredByTransak';
import Logger from '../../../../../util/Logger';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { useTransakController } from '../../hooks/useTransakController';
import type { TransakBuyQuote } from '@metamask/ramps-controller';
import Checkbox from '../../../../../component-library/components/Checkbox';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import {
  isMicaMockModeEnabled,
  mockSubmitMicaConsent,
} from '../../utils/micaMockMode';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import styleSheet from './MicaConsent.styles';

export interface MicaConsentParams {
  quote: TransakBuyQuote;
  /** Optional callback to continue KYC flow (for testing or direct navigation) */
  onConsentSubmitted?: () => void;
  headlessSessionId?: string;
}

const MicaConsent = (): React.JSX.Element => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});
  const { quote, onConsentSubmitted, headlessSessionId } =
    useParams<MicaConsentParams>();
  const { getUserDetails, submitMicaConsent: submitMicaConsentController } =
    useTransakController();
  const { routeAfterAuthentication } = useTransakRouting({
    screenLocation: 'MicaConsent Screen',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
  const [termsAndPrivacyConsent, setTermsAndPrivacyConsent] = useState(false);
  const [userDetails, setUserDetails] = useState<{
    firstName?: string;
    lastName?: string;
    dob?: string;
    mobileNumber?: string;
    address?: {
      addressLine1?: string;
      city?: string;
      postCode?: string;
      countryCode?: string;
    };
  } | null>(null);

  // Fetch user details on mount
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const details = await getUserDetails();
        if (mounted) {
          setUserDetails(details);
        }
      } catch (err) {
        Logger.error(err as Error, 'MicaConsent: Failed to fetch user details');
        if (mounted) {
          setError(
            parseUserFacingError(err, strings('deposit.mica.userDetailsError')),
          );
        }
      }
    })().catch((err) => {
      Logger.error(err as Error, 'MicaConsent: Unhandled error in effect');
    });
    return () => {
      mounted = false;
    };
  }, [getUserDetails]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOpenTransakSupport = useCallback(() => {
    Linking.openURL('https://support.transak.com').catch((err) =>
      Logger.error(err as Error, 'Failed to open Transak support URL'),
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!dataProcessingConsent || !termsAndPrivacyConsent) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const consentedAt = new Date().toISOString();

      let result;
      if (isMicaMockModeEnabled()) {
        result = await mockSubmitMicaConsent(consentedAt);
      } else {
        result = await submitMicaConsentController(consentedAt);
      }

      if (result && result.status === 'FAILED') {
        setError(strings('deposit.mica.consentSubmitError'));
        return;
      }

      if (onConsentSubmitted) {
        onConsentSubmitted();
      } else {
        await routeAfterAuthentication(quote);
      }
    } catch (err) {
      Logger.error(err as Error, 'MicaConsent: Failed to submit consent');
      setError(
        parseUserFacingError(err, strings('deposit.mica.consentSubmitError')),
      );
    } finally {
      setLoading(false);
    }
  }, [
    dataProcessingConsent,
    termsAndPrivacyConsent,
    onConsentSubmitted,
    quote,
    routeAfterAuthentication,
    submitMicaConsentController,
  ]);

  const isFormValid = dataProcessingConsent && termsAndPrivacyConsent;

  if (isMicaMockModeEnabled()) {
    Logger.log('[MiCA Mock] MicaConsent screen rendered in mock mode');
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          title={strings('deposit.mica_consent.header_title')}
          onBack={handleBack}
          onClose={handleClose}
          backButtonProps={{ testID: 'deposit-back-navbar-button' }}
          closeButtonProps={{ testID: 'deposit-close-navbar-button' }}
          includesTopInset
        />
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          enableAutomaticScroll
          showsVerticalScrollIndicator={false}
        >
          <ScreenLayout.Content>
            <View style={styles.section}>
              <Text variant={TextVariant.HeadingMd} style={styles.heading}>
                {strings('deposit.mica.continueWithTransak')}
              </Text>
              <Text variant={TextVariant.BodyMd} style={styles.description}>
                {strings('deposit.mica.description')}
              </Text>
            </View>

            {error && (
              <BannerAlert
                severity={BannerAlertSeverity.Error}
                title={strings('deposit.mica.errorTitle')}
                description={error}
                style={styles.errorBanner}
              />
            )}

            <View style={styles.section}>
              <Text variant={TextVariant.HeadingSm} style={styles.sectionTitle}>
                {strings('deposit.mica.reviewYourInformation')}
              </Text>
              <View style={styles.userDataBox}>
                {userDetails ? (
                  <>
                    <Text
                      variant={TextVariant.BodyMd}
                      style={styles.userDataRow}
                    >
                      <Text
                        variant={TextVariant.BodyMd}
                        style={styles.boldText}
                      >
                        {strings('deposit.mica.name')}:{' '}
                      </Text>
                      {userDetails.firstName} {userDetails.lastName}
                    </Text>
                    <Text
                      variant={TextVariant.BodyMd}
                      style={styles.userDataRow}
                    >
                      <Text
                        variant={TextVariant.BodyMd}
                        style={styles.boldText}
                      >
                        {strings('deposit.mica.dob')}:{' '}
                      </Text>
                      {userDetails.dob || strings('deposit.mica.notProvided')}
                    </Text>
                    <Text
                      variant={TextVariant.BodyMd}
                      style={styles.userDataRow}
                    >
                      <Text
                        variant={TextVariant.BodyMd}
                        style={styles.boldText}
                      >
                        {strings('deposit.mica_consent.address_label')}:{' '}
                      </Text>
                      {userDetails.address?.addressLine1 || ''}
                      {userDetails.address?.city ? ', ' : ''}
                      {userDetails.address?.city || ''}
                      {userDetails.address?.countryCode ? ', ' : ''}
                      {userDetails.address?.countryCode || ''}
                    </Text>
                    <Text
                      variant={TextVariant.BodyMd}
                      style={styles.userDataRow}
                    >
                      <Text
                        variant={TextVariant.BodyMd}
                        style={styles.boldText}
                      >
                        {strings('deposit.mica_consent.mobile_number_label')}
                        :{' '}
                      </Text>
                      {userDetails.mobileNumber ||
                        strings('deposit.mica.notProvided')}
                    </Text>
                  </>
                ) : (
                  <Text variant={TextVariant.BodyMd}>
                    {strings('deposit.mica.loadingDetails')}
                  </Text>
                )}
              </View>
              <Text variant={TextVariant.BodySm} style={styles.supportNotice}>
                {strings('deposit.mica_consent.support_notice_prefix')}{' '}
                <Text
                  variant={TextVariant.BodySm}
                  style={styles.linkText}
                  onPress={handleOpenTransakSupport}
                >
                  {strings('deposit.mica_consent.support_link_text')}
                </Text>{' '}
                {strings('deposit.mica_consent.support_notice_suffix')}
              </Text>
            </View>

            <View style={styles.section}>
              <Checkbox
                label={strings('deposit.mica_consent.data_processing_consent')}
                isChecked={dataProcessingConsent}
                onPress={() => setDataProcessingConsent(!dataProcessingConsent)}
              />
              <View style={styles.checkboxSpacing} />
              <View style={styles.checkboxRow}>
                <Checkbox
                  isChecked={termsAndPrivacyConsent}
                  onPress={() =>
                    setTermsAndPrivacyConsent(!termsAndPrivacyConsent)
                  }
                />
                <Text variant={TextVariant.BodyMd} style={styles.checkboxLabel}>
                  {strings('deposit.mica_consent.terms_consent_prefix')}{' '}
                  <Text
                    variant={TextVariant.BodyMd}
                    style={styles.linkText}
                    onPress={() => {
                      Linking.openURL(
                        'https://transak.com/terms-of-service',
                      ).catch((err) =>
                        Logger.error(err as Error, 'Failed to open Terms URL'),
                      );
                    }}
                  >
                    {strings('deposit.mica_consent.terms_link_text')}
                  </Text>{' '}
                  {strings('deposit.mica_consent.terms_consent_middle')}{' '}
                  <Text
                    variant={TextVariant.BodyMd}
                    style={styles.linkText}
                    onPress={() => {
                      Linking.openURL(
                        'https://transak.com/privacy-policy',
                      ).catch((err) =>
                        Logger.error(
                          err as Error,
                          'Failed to open Privacy URL',
                        ),
                      );
                    }}
                  >
                    {strings('deposit.mica_consent.privacy_link_text')}
                  </Text>
                  .
                </Text>
              </View>
            </View>
          </ScreenLayout.Content>
        </KeyboardAwareScrollView>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content style={styles.footerContent}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleSubmit}
            isLoading={loading}
            isDisabled={!isFormValid || loading}
            isFullWidth
          >
            {strings('deposit.mica.agreeAndContinue')}
          </Button>
          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default MicaConsent;
