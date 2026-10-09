import type { KycSessionStatus } from '@metamask/kyc-controller';
import type { RootState } from '../reducers';
import {
  selectKycSessionFinalStatus,
  selectKycSessionKycStatus,
  selectKycSessionStatus,
} from './kycController';

const createSessionStatus = (
  overrides: Partial<KycSessionStatus> = {},
): KycSessionStatus => ({
  id: 'session-1',
  finalStatus: 'pending',
  externalUserId: 'user-1',
  kycStatus: 'pending',
  vendor: 'sumsub',
  vendorStatus: 'pending',
  ...overrides,
});

const buildState = (kycControllerState?: Record<string, unknown>) =>
  ({
    engine: {
      backgroundState: {
        KycController: kycControllerState,
      },
    },
  }) as unknown as RootState;

describe('kycController selectors', () => {
  describe('selectKycSessionStatus', () => {
    it('returns the session status from KycController state', () => {
      const sessionStatus = createSessionStatus();
      const state = buildState({ sessionStatus });

      const result = selectKycSessionStatus(state);

      expect(result).toBe(sessionStatus);
    });

    it('returns null when there is no session', () => {
      const state = buildState({ sessionStatus: null });

      const result = selectKycSessionStatus(state);

      expect(result).toBeNull();
    });

    it('returns null when KycController state is missing', () => {
      const state = buildState(undefined);

      const result = selectKycSessionStatus(state);

      expect(result).toBeNull();
    });
  });

  describe('selectKycSessionFinalStatus', () => {
    it('returns the session finalStatus', () => {
      const state = buildState({
        sessionStatus: createSessionStatus({ finalStatus: 'approved' }),
      });

      const result = selectKycSessionFinalStatus(state);

      expect(result).toBe('approved');
    });

    it('returns null when there is no session', () => {
      const state = buildState({ sessionStatus: null });

      const result = selectKycSessionFinalStatus(state);

      expect(result).toBeNull();
    });
  });

  describe('selectKycSessionKycStatus', () => {
    it('returns the session kycStatus', () => {
      const state = buildState({
        sessionStatus: createSessionStatus({ kycStatus: 'approved' }),
      });

      const result = selectKycSessionKycStatus(state);

      expect(result).toBe('approved');
    });

    it('returns null when KycController state is missing', () => {
      const state = buildState(undefined);

      const result = selectKycSessionKycStatus(state);

      expect(result).toBeNull();
    });
  });
});
