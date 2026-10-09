import { getDefaultKycVendorDisclaimersAccepted } from '@metamask/kyc-controller';
import { RootState } from '../../reducers';
import {
  selectKycControllerState,
  selectKycProviderFlowStatus,
  selectKycSessionStatus,
  selectKycVendorDisclaimersAccepted,
} from './index';

const MOCK_SESSION_STATUS = {
  id: 'session-1',
  finalStatus: 'pending',
  kycStatus: 'pending',
  externalUserId: 'profile-1',
  vendor: 'sumsub',
  vendorStatus: 'pending',
};

const createMockRootState = (kycControllerState: unknown): RootState =>
  ({
    engine: { backgroundState: { KycController: kycControllerState } },
  }) as unknown as RootState;

describe('kycController selectors', () => {
  describe('selectKycControllerState', () => {
    it('returns the KycController state from the engine background state', () => {
      const kycState = { sessionStatus: MOCK_SESSION_STATUS };
      const state = createMockRootState(kycState);

      expect(selectKycControllerState(state)).toBe(kycState);
    });

    it('falls back to the controller defaults when the state is missing', () => {
      const state = {
        engine: { backgroundState: {} },
      } as unknown as RootState;

      expect(selectKycControllerState(state)).toEqual(
        expect.objectContaining({ sessionStatus: null }),
      );
    });
  });

  describe('selectKycSessionStatus', () => {
    it('returns the persisted session status', () => {
      const state = createMockRootState({
        sessionStatus: MOCK_SESSION_STATUS,
      });

      expect(selectKycSessionStatus(state)).toEqual(MOCK_SESSION_STATUS);
    });

    it('returns null when no session has been fetched', () => {
      const state = createMockRootState({ sessionStatus: null });

      expect(selectKycSessionStatus(state)).toBeNull();
    });

    it('returns null when the controller state is missing', () => {
      const state = {
        engine: { backgroundState: {} },
      } as unknown as RootState;

      expect(selectKycSessionStatus(state)).toBeNull();
    });
  });

  describe('selectKycProviderFlowStatus', () => {
    it('returns the durable provider flow status', () => {
      const state = createMockRootState({ providerFlowStatus: 'submitted' });

      expect(selectKycProviderFlowStatus(state)).toBe('submitted');
    });

    it("defaults to 'not_started' when absent", () => {
      const state = createMockRootState({});

      expect(selectKycProviderFlowStatus(state)).toBe('not_started');
    });
  });

  describe('selectKycVendorDisclaimersAccepted', () => {
    it('returns the persisted vendor disclaimers acceptance', () => {
      const vendorDisclaimersAccepted = {
        ...getDefaultKycVendorDisclaimersAccepted(),
        moonpay: { termsAcceptedAt: '2026-10-08T00:00:00.000Z' },
      };
      const state = createMockRootState({ vendorDisclaimersAccepted });

      expect(selectKycVendorDisclaimersAccepted(state)).toEqual(
        vendorDisclaimersAccepted,
      );
    });

    it('falls back to the controller defaults when absent', () => {
      const state = createMockRootState({});

      expect(selectKycVendorDisclaimersAccepted(state)).toEqual(
        getDefaultKycVendorDisclaimersAccepted(),
      );
    });
  });
});
