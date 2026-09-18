import { RootState } from '../reducers';
import { selectKycUserStatus } from './kycController';

const createMockRootState = (userStatus: string | null): RootState =>
  ({
    engine: {
      backgroundState: {
        KycController: {
          userStatus,
        },
      },
    },
  }) as unknown as RootState;

describe('kycController selectors', () => {
  describe('selectKycUserStatus', () => {
    it('returns pending when the controller status is pending', () => {
      const result = selectKycUserStatus(createMockRootState('pending'));

      expect(result).toBe('pending');
    });

    it('returns completed when the controller status is completed', () => {
      const result = selectKycUserStatus(createMockRootState('completed'));

      expect(result).toBe('completed');
    });

    it('returns null when the controller has not refreshed status', () => {
      const result = selectKycUserStatus(createMockRootState(null));

      expect(result).toBeNull();
    });
  });
});
