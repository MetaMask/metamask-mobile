import { selectIsFirstTimeUser } from './selectors';
import type { PerpsControllerState } from './PerpsController';

describe('PerpsController selectors', () => {
  describe('selectIsFirstTimeUser', () => {
    it('should return true when state is undefined', () => {
      expect(selectIsFirstTimeUser(undefined)).toBe(true);
    });

    it('should return true when isFirstTimeUser is true', () => {
      const state = {
        isFirstTimeUser: { testnet: true, mainnet: true },
      } as PerpsControllerState;
      expect(selectIsFirstTimeUser(state)).toBe(true);
    });

    it('should return false when isFirstTimeUser is false', () => {
      const state = {
        isFirstTimeUser: { testnet: false, mainnet: false },
      } as PerpsControllerState;
      expect(selectIsFirstTimeUser(state)).toBe(false);
    });

    it('should return true when isFirstTimeUser is undefined in state', () => {
      const state = {} as PerpsControllerState;
      expect(selectIsFirstTimeUser(state)).toBe(true);
    });
  });
});
