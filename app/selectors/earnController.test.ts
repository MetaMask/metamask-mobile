import { selectPooledStakingEligibility } from './earnController';
import { RootState } from '../reducers';

describe('Earn Controller Selectors', () => {
  describe('selectEarnControllerState', () => {
    it('returns selected pooled-staking eligibilty', () => {
      const state = {
        engine: {
          backgroundState: {
            EarnController: {
              pooled_staking: {
                isEligible: true,
              },
            },
          },
        },
      };

      expect(
        selectPooledStakingEligibility(state as unknown as RootState),
      ).toBe(true);
    });
  });
});
