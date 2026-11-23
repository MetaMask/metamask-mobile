/**
 * One-time MiCA consent for existing EEA users. Displays user data (read-only)
 * and requires acceptance of data processing consent and Terms/Privacy Policy.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
  Checkbox,
} from '@metamask/design-system-react-native';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { useStyles } from '../../../../hooks/useStyles';
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { useTransakRouting } from '../../hooks/useTransakRouting';
import Routes from '../../../../../constants/navigation/Routes';
import PoweredByTransak from '../../components/PoweredByTransak';
import Logger from '../../../../../util/Logger';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { useTransakController } from '../../hooks/useTransakController';
import type {
  TransakBuyQuote,
  TransakUserDetails,
  TransakUserDetailsAddress,
} from '@metamask/ramps-controller';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import styleSheet from './MicaConsent.styles';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button';

/**
 * Generates an ISO 8601 timestamp with timezone offset (e.g. 2024-01-15T10:30:00+01:00)
 */
function generateConsentTimestamp(): string {
  const now = new Date();
  const offsetMinutes = -now.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const pad = (n: number) => String(n).padStart(2, '0');

  const isoDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const isoTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const offset = `${offsetSign}${pad(offsetHours)}:${pad(offsetMins)}`;

  return `${isoDate}T${isoTime}${offset}`;
}

/**
 * Transak returns `dob` as an ISO timestamp. Show the calendar date in UTC so
 * a midnight timestamp does not shift into the previous day.
 */
export function formatConsentDob(
  dob: string | undefined,
  fallback: string,
): string {
  if (!dob) {
    return fallback;
  }
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) {
    return dob;
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Street on the first line, then postcode, city and country. */
export function formatConsentAddress(
  address: TransakUserDetailsAddress | undefined,
): string {
  if (!address) {
    return '';
  }
  const street = [address.addressLine1, address.addressLine2]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
  const locality = [address.postCode, address.city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  const country = address.country?.trim() || address.countryCode?.trim() || '';
  const secondLine = [locality, country].filter(Boolean).join(', ');
  return [street, secondLine].filter(Boolean).join('\n');
}

export interface MicaConsentParams {
  quote: TransakBuyQuote;
  quoteId: string;
  /** Optional callback to continue KYC flow (for testing or direct navigation) */
  onConsentSubmitted?: () => void;
  headlessSessionId?: string;
}

const MicaConsent = (): React.JSX.Element => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled);
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});
  const { quote, quoteId, onConsentSubmitted, headlessSessionId } =
    useParams<MicaConsentParams>();
  const {
    getUserDetails,
    submitMicaConsent: submitMicaConsentController,
    getKycRequirement,
    getAdditionalRequirements,
  } = useTransakController();
  // For headless buy flows, post-auth resets must land back on the Host
  // (which carries the live `headlessSessionId`) instead of BuildQuote.
  const transakRoutingConfig = useMemo(
    () => ({
      screenLocation: 'MicaConsent Screen',
      ...(headlessSessionId
        ? {
            baseRoute: Routes.RAMP.HEADLESS_HOST,
            baseRouteParams: { headlessSessionId },
          }
        : {}),
    }),
    [headlessSessionId],
  );
  const { routeAfterAuthentication } = useTransakRouting(transakRoutingConfig);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
  const [termsAndPrivacyConsent, setTermsAndPrivacyConsent] = useState(false);
  const [capturedConsentedAt, setCapturedConsentedAt] = useState<string | null>(
    null,
  );
  const [retrying, setRetrying] = useState(false);
  const [userDetails, setUserDetails] = useState<TransakUserDetails | null>(
    null,
  );

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

  const handleRetry = useCallback(async () => {
    if (!capturedConsentedAt) {
      Logger.error(new Error('MicaConsent: No captured consentedAt for retry'));
      return;
    }

    setRetrying(true);
    setError(null);
    setLoading(true);

    try {
      const result = await submitMicaConsentController(capturedConsentedAt);

      if (result.status === 'FAILED') {
        setError(strings('deposit.mica.consentSubmitError'));
        return;
      }

      await getKycRequirement(quoteId);
      await getAdditionalRequirements(quoteId);

      if (onConsentSubmitted) {
        onConsentSubmitted();
      } else {
        await routeAfterAuthentication(quote);
      }
    } catch (err) {
      Logger.error(err as Error, 'MicaConsent: Failed to retry consent');
      setError(
        parseUserFacingError(err, strings('deposit.mica.consentSubmitError')),
      );
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [
    capturedConsentedAt,
    submitMicaConsentController,
    quoteId,
    getKycRequirement,
    getAdditionalRequirements,
    onConsentSubmitted,
    quote,
    routeAfterAuthentication,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!dataProcessingConsent || !termsAndPrivacyConsent) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const consentedAt = generateConsentTimestamp();
      setCapturedConsentedAt(consentedAt);

      const result = await submitMicaConsentController(consentedAt);

      if (result.status === 'FAILED') {
        setError(strings('deposit.mica.consentSubmitError'));
        return;
      }

      await getKycRequirement(quoteId);
      await getAdditionalRequirements(quoteId);

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
    submitMicaConsentController,
    quoteId,
    getKycRequirement,
    getAdditionalRequirements,
    onConsentSubmitted,
    quote,
    routeAfterAuthentication,
  ]);

  // Consent is only valid once the user has seen the details being consented to.
  const isFormValid =
    dataProcessingConsent && termsAndPrivacyConsent && userDetails !== null;

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
                actionButtonProps={
                  capturedConsentedAt
                    ? {
                        variant: ButtonVariants.Link,
                        label: strings('deposit.mica.retry_button'),
                        onPress: () => {
                          void handleRetry();
                        },
                        disabled: loading || retrying,
                      }
                    : undefined
                }
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
                      {formatConsentDob(
                        userDetails.dob,
                        strings('deposit.mica.notProvided'),
                      )}
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
                      {formatConsentAddress(userDetails.address) ||
                        strings('deposit.mica.notProvided')}
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
                isSelected={dataProcessingConsent}
                onChange={setDataProcessingConsent}
                twClassName="items-start"
                testID="mica-consent-data-processing-checkbox"
                accessibilityLabel={strings(
                  'deposit.mica_consent.data_processing_consent',
                )}
                label={
                  <Text variant={TextVariant.BodyMd} twClassName="ml-3 flex-1">
                    {strings('deposit.mica_consent.data_processing_consent')}
                  </Text>
                }
              />
              <View style={styles.checkboxSpacing} />
              <Checkbox
                isSelected={termsAndPrivacyConsent}
                onChange={setTermsAndPrivacyConsent}
                twClassName="items-start"
                testID="mica-consent-terms-checkbox"
                accessibilityLabel={[
                  strings('deposit.mica_consent.terms_consent_prefix'),
                  strings('deposit.mica_consent.terms_link_text'),
                  strings('deposit.mica_consent.terms_consent_middle'),
                  strings('deposit.mica_consent.privacy_link_text'),
                ].join(' ')}
                label={
                  <Text variant={TextVariant.BodyMd} twClassName="ml-3 flex-1">
                    {strings('deposit.mica_consent.terms_consent_prefix')}{' '}
                    <Text
                      variant={TextVariant.BodyMd}
                      style={styles.linkText}
                      onPress={() => {
                        Linking.openURL(
                          'https://transak.com/terms-of-service',
                        ).catch((err) =>
                          Logger.error(
                            err as Error,
                            'Failed to open Terms URL',
                          ),
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
                }
              />
            </View>
          </ScreenLayout.Content>
        </KeyboardAwareScrollView>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content style={styles.footerContent}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={() => {
              void handleSubmit();
            }}
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
