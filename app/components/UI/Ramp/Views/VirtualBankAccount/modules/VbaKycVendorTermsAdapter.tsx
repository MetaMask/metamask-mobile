import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import VendorTerms, {
  type VendorTermsDocument,
  type VendorTermsEvent,
} from '../../../../KYC/Views/VendorTerms/VendorTerms';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { strings } from '../../../../../../../locales/i18n';
import { MOONPAY_PRIVACY_POLICY_URL, VBA_KYC_VENDOR } from '../constants';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';
import { buildVbaBaseProperties, trackVbaEvent } from '../vbaAnalytics';

const VENDOR_TERMS_SCREEN_NAME = 'vba_vendor_terms';

/**
 * Hosts the KYC-owned vendor terms screen inside VBA onboarding. VBA supplies
 * the vendor, the MoonPay privacy policy (TRAM-4169) and its own analytics.
 */
const VbaKycVendorTermsAdapter = () => {
  const navigation = useNavigation();
  const advance = useOpenVbaOnboarding('vendor-terms-complete');
  const handleAccepted = useCallback(() => advance(), [advance]);
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const additionalDocuments = useMemo<VendorTermsDocument[]>(
    () => [
      {
        id: 'moonpay-privacy-policy',
        label: strings(
          'virtual_bank_account.create_virtual_bank_account.moonpay_privacy_policy_link',
        ),
        url: MOONPAY_PRIVACY_POLICY_URL,
      },
    ],
    [],
  );

  const handleEvent = useCallback((event: VendorTermsEvent) => {
    trackVbaEvent(MetaMetricsEvents.MONEY_VBA_VENDOR_TERMS_UPDATED, () => ({
      ...buildVbaBaseProperties({
        screenName: VENDOR_TERMS_SCREEN_NAME,
        failureReason: event.status === 'failed' ? event.reason : undefined,
      }),
      status: event.status,
      vendor: VBA_KYC_VENDOR,
    }));
  }, []);

  return (
    <VendorTerms
      vendor={VBA_KYC_VENDOR}
      additionalDocuments={additionalDocuments}
      onAccepted={handleAccepted}
      onBack={handleBack}
      onEvent={handleEvent}
    />
  );
};

export default VbaKycVendorTermsAdapter;
