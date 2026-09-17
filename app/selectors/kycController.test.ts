import {
  selectKycSessionId,
  selectKycSessionStatus,
  selectKycSessionStatusMessage,
} from './kycController';
import { RootState } from '../reducers';

const createState = (
  kycController?: Partial<
    RootState['engine']['backgroundState']['KycController']
  >,
): RootState =>
  ({
    engine: {
      backgroundState: {
        KycController: kycController,
      },
    },
  }) as RootState;

describe('KycController selectors', () => {
  it('returns sessionStatus.finalStatus from KycController state', () => {
    const state = createState({
      sessionStatus: {
        finalStatus: 'pending',
        externalUserId: 'user-1',
        kycStatus: 'pending',
        vendor: 'iron',
        vendorStatus: 'pending',
        sessionId: 'session-1',
      },
    });

    expect(selectKycSessionStatus(state)).toBe('pending');
  });

  it('returns sessionId from KycController state', () => {
    const state = createState({ sessionId: 'session-1' });

    expect(selectKycSessionId(state)).toBe('session-1');
  });

  it('returns sessionStatus.statusMessage from KycController state', () => {
    const state = createState({
      sessionStatus: {
        finalStatus: 'rejected',
        statusMessage: 'session_not_in_valid_state',
        externalUserId: 'user-1',
        kycStatus: 'rejected',
        vendor: 'iron',
        vendorStatus: 'rejected',
      },
    });

    expect(selectKycSessionStatusMessage(state)).toBe(
      'session_not_in_valid_state',
    );
  });

  it('returns null when KycController state is missing', () => {
    const state = { engine: { backgroundState: {} } } as RootState;

    expect(selectKycSessionStatus(state)).toBeNull();
    expect(selectKycSessionId(state)).toBeNull();
    expect(selectKycSessionStatusMessage(state)).toBeNull();
  });
});
