import {
  selectKycUserStatus,
  selectKycUserStatusErrorCode,
  selectKycUserStatusSumsubSessionId,
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
  it('returns userStatus from KycController state', () => {
    const state = createState({ userStatus: 'pending' });

    expect(selectKycUserStatus(state)).toBe('pending');
  });

  it('returns userStatusSumsubSessionId from KycController state', () => {
    const state = createState({ userStatusSumsubSessionId: 'session-1' });

    expect(selectKycUserStatusSumsubSessionId(state)).toBe('session-1');
  });

  it('returns userStatusErrorCode from KycController state', () => {
    const state = createState({
      userStatusErrorCode: 'session_not_in_valid_state',
    });

    expect(selectKycUserStatusErrorCode(state)).toBe(
      'session_not_in_valid_state',
    );
  });

  it('returns null when KycController state is missing', () => {
    const state = { engine: { backgroundState: {} } } as RootState;

    expect(selectKycUserStatus(state)).toBeNull();
    expect(selectKycUserStatusSumsubSessionId(state)).toBeNull();
    expect(selectKycUserStatusErrorCode(state)).toBeNull();
  });
});
