import { MetaMetricsEvents } from '../../../../core/Analytics';
import { trackVbaEvent } from '../../Ramp/Views/VirtualBankAccount/vbaAnalytics';
import { buildKycBaseProperties } from './kycBaseProperties';

/**
 * `status` reported on `KYC Identity Terms Updated`.
 *
 * Identity verification presents its terms over two pages — the introduction
 * and the verification partners — so each page reports its own view and
 * acceptance. `failed` stays unsplit: it only fires where the disclaimer
 * catalog is fetched, which is page 1.
 */
export type KycIdentityTermsStatus =
  | 'page1_viewed'
  | 'page1_accepted'
  | 'page2_viewed'
  | 'page2_accepted'
  | 'failed';

/**
 * Sends one `KYC Identity Terms Updated` event.
 *
 * @param status - Where the user got to in the terms pages.
 */
export const trackIdentityTerms = (status: KycIdentityTermsStatus): void =>
  trackVbaEvent(MetaMetricsEvents.KYC_IDENTITY_TERMS_UPDATED, () => ({
    ...buildKycBaseProperties(),
    status,
  }));
