import { MetaMetricsEvents } from '../../../../core/Analytics';
import { trackVbaEvent } from '../../Ramp/Views/VirtualBankAccount/vbaAnalytics';
import { buildKycBaseProperties } from './kycBaseProperties';

export type IdentityTermsStatus = 'viewed' | 'accepted' | 'failed';

/**
 * Tracks the identity terms step of VBA onboarding: `viewed` on Verify your
 * identity, then `failed` or `accepted` on Our verification partners.
 *
 * @param status - Where the user is in the identity terms step.
 */
export const trackIdentityTerms = (status: IdentityTermsStatus) =>
  trackVbaEvent(MetaMetricsEvents.KYC_IDENTITY_TERMS_UPDATED, () => ({
    ...buildKycBaseProperties(),
    status,
  }));
