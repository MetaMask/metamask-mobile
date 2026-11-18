/**
 * MiCA Consent Screen
 *
 * One-time consent for existing EEA users per MiCA regulations. Shows user data
 * (read-only), data processing consent, and Terms/Privacy Policy agreement.
 *
 * Rendered when Get Additional Requirements returns type: 'CONSENT'.
 */

import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
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
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
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
    })();
    return () => {
      mounted = false;
    };
  }, [getUserDetails]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSubmit = useCallback(async () => {
    if (!dataProcessingConsent || !termsAndPrivacyConsent) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Capture consent timestamp in ISO 8601 with time zone offset
      const consentedAt = new Date().toISOString();

      // Mock mode or real submission
      if (isMicaMockModeEnabled()) {
        await mockSubmitMicaConsent(consentedAt);
      } else {
        // Real submission via controller (requires core PR integration)
        await submitMicaConsentController(consentedAt);
      }

      // Navigate back to the flow or call the callback
      if (onConsentSubmitted) {
        onConsentSubmitted();
      } else {
        // By default, go back and let the routing logic re-fetch requirements
        navigation.goBack();
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
    navigation,
    submitMicaConsentController,
  ]);

  const isFormValid = dataProcessingConsent && termsAndPrivacyConsent;

  if (isMicaMockModeEnabled()) {
    Logger.log('[MiCA Mock] MicaConsent screen rendered in mock mode');
  }

  return (
    <ScreenLayout
      title={strings('deposit.mica.title')}
      handleBack={handleBack}
      HeaderComponent={isGlassHeader ? HeaderStandardGlass : undefined}
      showHelpButton={false}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text variant={TextVariant.HeadingMD} style={styles.heading}>
            {strings('deposit.mica.continueWithTransak')}
          </Text>
          <Text variant={TextVariant.BodyMD} style={styles.description}>
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
          <Text variant={TextVariant.HeadingSM} style={styles.sectionTitle}>
            {strings('deposit.mica.reviewYourInformation')}
          </Text>
          <View style={styles.userDataBox}>
            {userDetails ? (
              <>
                <Text variant={TextVariant.BodyMD} style={styles.userDataRow}>
                  <Text variant={TextVariant.BodyMDBold}>
                    {strings('deposit.mica.name')}:{' '}
                  </Text>
                  {userDetails.firstName} {userDetails.lastName}
                </Text>
                <Text variant={TextVariant.BodyMD} style={styles.userDataRow}>
                  <Text variant={TextVariant.BodyMDBold}>
                    {strings('deposit.mica.dob')}:{' '}
                  </Text>
                  {userDetails.dob || strings('deposit.mica.notProvided')}
                </Text>
                <Text variant={TextVariant.BodyMD} style={styles.userDataRow}>
                  <Text variant={TextVariant.BodyMDBold}>
                    {strings('deposit.mica.phone')}:{' '}
                  </Text>
                  {userDetails.mobileNumber || strings('deposit.mica.notProvided')}
                </Text>
                <Text variant={TextVariant.BodyMD} style={styles.userDataRow}>
                  <Text variant={TextVariant.BodyMDBold}>
                    {strings('deposit.mica.address')}:{' '}
                  </Text>
                  {userDetails.address?.addressLine1 || ''}, {userDetails.address?.city || ''},{' '}
                  {userDetails.address?.postCode || ''}, {userDetails.address?.countryCode || ''}
                </Text>
              </>
            ) : (
              <Text variant={TextVariant.BodyMD}>
                {strings('deposit.mica.loadingDetails')}
              </Text>
            )}
          </View>
          <Text variant={TextVariant.BodySM} style={styles.supportNotice}>
            {strings('deposit.mica.supportNotice')}
          </Text>
        </View>

        <View style={styles.section}>
          <Checkbox
            label={strings('deposit.mica.dataProcessingConsent')}
            isChecked={dataProcessingConsent}
            onPress={() => setDataProcessingConsent(!dataProcessingConsent)}
          />
          <View style={styles.checkboxSpacing} />
          <Checkbox
            label={strings('deposit.mica.termsAndPrivacyConsent')}
            isChecked={termsAndPrivacyConsent}
            onPress={() => setTermsAndPrivacyConsent(!termsAndPrivacyConsent)}
          />
        </View>

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          label={strings('deposit.mica.agreeAndContinue')}
          onPress={handleSubmit}
          isLoading={loading}
          isDisabled={!isFormValid || loading}
          style={styles.button}
        />

        <PoweredByTransak style={styles.poweredBy} />
      </ScrollView>
    </ScreenLayout>
  );
};

export default MicaConsent;
