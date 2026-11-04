import { RootState } from '../../reducers';
import {
  selectKycControllerState,
  selectKycProviderFlowStatus,
  selectKycSessionStatus,
  selectKycVendorDisclaimersAccepted,
  selectKycVendorSession,
} from './index';

const MOCK_SESSION_STATUS = {
  id: 'session-1',
  finalStatus: 'pending',
  kycStatus: 'pending',
  externalUserId: 'profile-1',
  vendor: 'sumsub',
  vendorStatus: 'pending',
};

const MOCK_IRON_ENTRY = {
  sessionStatus: MOCK_SESSION_STATUS,
  providerFlowStatus: 'submitted',
  residenceCountry: 'BRA',
  vendorDisclaimersAccepted: {
    disclaimerIds: ['t1'],
    acceptedAt: null,
    submitted: true,
  },
  providerDisclaimersAccepted: null,
  idosDisclaimersAccepted: null,
  credentialReusabilityConsentGiven: null,
};

const createMockRootState = (kycControllerState: unknown): RootState =>
  ({
    engine: { backgroundState: { KycController: kycControllerState } },
  }) as unknown as RootState;

const missingControllerState = {
  engine: { backgroundState: {} },
} as unknown as RootState;

describe('kycController selectors', () => {
  it('selectKycControllerState falls back to empty sessions', () => {
    expect(selectKycControllerState(missingControllerState)).toEqual({
      sessions: {},
    });
  });

  it('selects a vendor entry', () => {
    const state = createMockRootState({ sessions: { iron: MOCK_IRON_ENTRY } });

    expect(selectKycVendorSession(state, 'iron')).toBe(MOCK_IRON_ENTRY);
    expect(selectKycVendorSession(state, 'moonpay')).toBeUndefined();
  });

  it('selects a vendor session status, provider flow and acceptance', () => {
    const state = createMockRootState({ sessions: { iron: MOCK_IRON_ENTRY } });

    expect(selectKycSessionStatus(state, 'iron')).toEqual(MOCK_SESSION_STATUS);
    expect(selectKycProviderFlowStatus(state, 'iron')).toBe('submitted');
    expect(selectKycVendorDisclaimersAccepted(state, 'iron')).toEqual(
      MOCK_IRON_ENTRY.vendorDisclaimersAccepted,
    );
  });

  it('returns defaults for a vendor with no entry', () => {
    expect(selectKycSessionStatus(missingControllerState, 'iron')).toBeNull();
    expect(selectKycProviderFlowStatus(missingControllerState, 'iron')).toBe(
      'not_started',
    );
    expect(
      selectKycVendorDisclaimersAccepted(missingControllerState, 'iron'),
    ).toBeNull();
  });
});
