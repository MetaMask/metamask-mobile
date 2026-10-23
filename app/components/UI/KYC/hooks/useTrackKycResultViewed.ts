import { useEffect } from 'react';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  buildKycBaseProperties,
  trackVbaEvent,
  type VbaKycAnalyticsStatus,
} from '../../Ramp/Views/VirtualBankAccount/vbaAnalytics';

/**
 * Tracks `KYC Result Viewed` once when a KYC result page mounts. `kycStatus`
 * is the terminal status the page shows, so it is sent as given instead of
 * read from a possibly older hydrate.
 *
 * @param kycStatus - The status displayed on the result page.
 */
export const useTrackKycResultViewed = (
  kycStatus: Extract<
    VbaKycAnalyticsStatus,
    'pending' | 'rejected' | 'approved'
  >,
): void => {
  useEffect(() => {
    trackVbaEvent(
      MetaMetricsEvents.KYC_RESULT_VIEWED,
      buildKycBaseProperties({ kycStatus }),
    );
  }, [kycStatus]);
};
