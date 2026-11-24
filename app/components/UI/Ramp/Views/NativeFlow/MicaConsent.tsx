/**
 * One-time MiCA consent for existing EEA users. Displays user data (read-only)
 * and requires acceptance of data processing consent and Terms/Privacy Policy.
 */

import React, { useCallback, useRef, useState } from 'react';
import { View, Linking } from 'react-native';
import {
  Text,
  TextVariant,
  Box,
  Checkbox,
  FontWeight,
  TextButton,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { useTransakController } from '../../hooks/useTransakController';
import { useMicaSubmit } from '../../hooks/useMicaSubmit';
import type {
  TransakAdditionalRequirement,
  TransakBuyQuote,
  TransakUserDetails,
  TransakUserDetailsAddress,
} from '@metamask/ramps-controller';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import {
  TRANSAK_SUPPORT_URL,
  TRANSAK_TERMS_URL_WORLD,
} from '../../constants/transak';
import MicaKycFormLayout from './MicaKycFormLayout';
import styleSheet from './MicaConsent.styles';

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
  metadata?: TransakAdditionalRequirement['metadata'];
  headlessSessionId?: string;
}

const openExternalUrl = (url: string, failureMessage: string) => {
  Linking.openURL(url).catch((err) =>
    Logger.error(err as Error, failureMessage),
  );
};

const MicaConsent = (): React.JSX.Element => {
  const { styles } = useStyles(styleSheet, {});
  const { quote, quoteId, headlessSessionId } = useParams<MicaConsentParams>();
  const {
    getUserDetails,
    submitMicaConsent: submitMicaConsentController,
    getKycRequirement,
    getAdditionalRequirements,
  } = useTransakController();
  const { loading, error, setError, submit } = useMicaSubmit({
    screenLocation: 'MicaConsent Screen',
    quote,
    quoteId,
    headlessSessionId,
    getKycRequirement,
    getAdditionalRequirements,
    submitError: strings('deposit.mica.consentSubmitError'),
    logContext: 'MicaConsent',
  });

  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
  const [termsAndPrivacyConsent, setTermsAndPrivacyConsent] = useState(false);
  const [capturedConsentedAt, setCapturedConsentedAt] = useState<string | null>(
    null,
  );
  const [userDetails, setUserDetails] = useState<TransakUserDetails | null>(
    null,
  );

  const [userDetailsFailed, setUserDetailsFailed] = useState(false);
  const isMountedRef = useRef(true);

  const loadUserDetails = useCallback(async () => {
    setUserDetailsFailed(false);
    try {
      const details = await getUserDetails();
      if (isMountedRef.current) {
        setUserDetails(details);
        setError(null);
      }
    } catch (err) {
      Logger.error(err as Error, 'MicaConsent: Failed to fetch user details');
      if (isMountedRef.current) {
        setUserDetailsFailed(true);
        setError(
          parseUserFacingError(err, strings('deposit.mica.userDetailsError')),
        );
      }
    }
  }, [getUserDetails, setError]);

  // Fetch user details on mount
  React.useEffect(() => {
    isMountedRef.current = true;
    loadUserDetails().catch((err) => {
      Logger.error(err as Error, 'MicaConsent: Unhandled error in effect');
    });
    return () => {
      isMountedRef.current = false;
    };
  }, [loadUserDetails]);

  const handleRetry = useCallback(async () => {
    if (!capturedConsentedAt) {
      Logger.error(new Error('MicaConsent: No captured consentedAt for retry'));
      return;
    }

    await submit(
      async () => submitMicaConsentController(capturedConsentedAt),
      'Failed to retry consent',
    );
  }, [capturedConsentedAt, submit, submitMicaConsentController]);

  const handleSubmit = useCallback(async () => {
    if (!dataProcessingConsent || !termsAndPrivacyConsent) {
      return;
    }

    const consentedAt = generateConsentTimestamp();
    setCapturedConsentedAt(consentedAt);

    await submit(
      async () => submitMicaConsentController(consentedAt),
      'Failed to submit consent',
    );
  }, [
    dataProcessingConsent,
    termsAndPrivacyConsent,
    submit,
    submitMicaConsentController,
  ]);

  // A failed details fetch is retried by reloading the details; otherwise the
  // banner retries a previously captured consent submission.
  let bannerRetryHandler: (() => void) | undefined;
  if (userDetailsFailed) {
    bannerRetryHandler = () => {
      void loadUserDetails();
    };
  } else if (capturedConsentedAt) {
    bannerRetryHandler = () => {
      void handleRetry();
    };
  }

  // Consent is only valid once the user has seen the details being consented to.
  const isFormValid =
    dataProcessingConsent && termsAndPrivacyConsent && userDetails !== null;

  const notProvided = strings('deposit.mica.notProvided');
  const userDataRows = userDetails
    ? [
        {
          label: strings('deposit.mica.name'),
          value: [userDetails.firstName, userDetails.lastName].join(' '),
        },
        {
          label: strings('deposit.mica.dob'),
          value: formatConsentDob(userDetails.dob, notProvided),
        },
        {
          label: strings('deposit.mica_consent.address_label'),
          value: formatConsentAddress(userDetails.address) || notProvided,
        },
        {
          label: strings('deposit.mica_consent.mobile_number_label'),
          value: userDetails.mobileNumber || notProvided,
        },
      ]
    : [];

  return (
    <MicaKycFormLayout
      headerTitle={strings('deposit.source_of_income.header_title')}
      title={strings('deposit.mica.continueWithTransak')}
      subtitle={strings('deposit.mica.description')}
      error={error}
      errorRetry={
        bannerRetryHandler
          ? {
              label: strings('deposit.mica.retry_button'),
              onRetry: bannerRetryHandler,
            }
          : undefined
      }
      loading={loading}
      isSubmitDisabled={!isFormValid}
      onSubmit={handleSubmit}
      submitLabel={strings('deposit.mica.agreeAndContinue')}
      showPrivacyNotice={false}
    >
      <View>
        <Text variant={TextVariant.HeadingSm} style={styles.sectionTitle}>
          {strings('deposit.mica.reviewYourInformation')}
        </Text>
        <Box style={styles.userDataBox} twClassName="rounded-lg">
          {userDetails ? (
            userDataRows.map(({ label, value }) => (
              <Text
                key={label}
                variant={TextVariant.BodyMd}
                style={styles.userDataRow}
              >
                <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
                  {label}:{' '}
                </Text>
                {value}
              </Text>
            ))
          ) : (
            <Text variant={TextVariant.BodyMd}>
              {userDetailsFailed
                ? strings('deposit.mica.userDetailsError')
                : strings('deposit.mica.loadingDetails')}
            </Text>
          )}
        </Box>
        <Text variant={TextVariant.BodySm} style={styles.supportNotice}>
          {strings('deposit.mica_consent.support_notice_prefix')}{' '}
          <Text
            variant={TextVariant.BodySm}
            style={styles.linkText}
            onPress={() =>
              openExternalUrl(
                TRANSAK_SUPPORT_URL,
                'Failed to open Transak support URL',
              )
            }
          >
            {strings('deposit.mica_consent.support_link_text')}
          </Text>
          {strings('deposit.mica_consent.support_notice_suffix')}
        </Text>
      </View>

      <View>
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
              <TextButton
                variant={TextVariant.BodyMd}
                onPress={() =>
                  openExternalUrl(
                    TRANSAK_TERMS_URL_WORLD,
                    'Failed to open Terms URL',
                  )
                }
              >
                {strings('deposit.mica_consent.terms_link_text')}
              </TextButton>{' '}
              {strings('deposit.mica_consent.terms_consent_middle')}{' '}
              <TextButton
                variant={TextVariant.BodyMd}
                onPress={() =>
                  openExternalUrl(
                    'https://transak.com/privacy-policy',
                    'Failed to open Privacy URL',
                  )
                }
              >
                {strings('deposit.mica_consent.privacy_link_text')}
              </TextButton>
              .
            </Text>
          }
        />
      </View>
    </MicaKycFormLayout>
  );
};

export default MicaConsent;
