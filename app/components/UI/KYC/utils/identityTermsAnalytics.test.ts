import { MetaMetricsEvents } from '../../../../core/Analytics';
import { trackIdentityTerms } from './identityTermsAnalytics';
import { trackKycEvent } from './trackKycEvent';

jest.mock('./trackKycEvent', () => ({
  trackKycEvent: jest.fn(),
}));

jest.mock('./kycBaseProperties', () => ({
  buildKycBaseProperties: () => ({
    screen_name: 'vba_onboarding',
    kyc_provider: 'sumsub',
  }),
}));

describe('trackIdentityTerms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    'page1_viewed',
    'page1_accepted',
    'page2_viewed',
    'page2_accepted',
    'failed',
  ] as const)('sends %s on the identity terms event', (status) => {
    trackIdentityTerms(status);

    const [event, buildProperties] = jest.mocked(trackKycEvent).mock.calls[0];
    expect(event).toBe(MetaMetricsEvents.KYC_IDENTITY_TERMS_UPDATED);
    expect(buildProperties()).toStrictEqual({
      screen_name: 'vba_onboarding',
      kyc_provider: 'sumsub',
      status,
    });
  });
});
