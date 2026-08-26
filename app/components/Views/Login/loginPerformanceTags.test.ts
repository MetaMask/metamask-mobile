import {
  getLoginAppStartType,
  getLoginInteractionEndData,
  getLoginPerformanceTags,
  LOGIN_APP_START_TYPE,
  LOGIN_CONTENT_STATE,
  markLoginInteractionCompleted,
  resetLoginAppStartTypeForTesting,
} from './loginPerformanceTags';

describe('loginPerformanceTags', () => {
  beforeEach(() => {
    resetLoginAppStartTypeForTesting();
  });

  describe('getLoginAppStartType', () => {
    it('returns cold before any login interaction completes', () => {
      const result = getLoginAppStartType();

      expect(result).toBe(LOGIN_APP_START_TYPE.COLD);
    });

    it('returns warm after a login interaction completes', () => {
      markLoginInteractionCompleted();

      const result = getLoginAppStartType();

      expect(result).toBe(LOGIN_APP_START_TYPE.WARM);
    });
  });

  describe('getLoginPerformanceTags', () => {
    it('includes locked and cold app_start_type before unlock', () => {
      const result = getLoginPerformanceTags(true);

      expect(result).toEqual({
        locked: true,
        app_start_type: LOGIN_APP_START_TYPE.COLD,
      });
    });

    it('includes warm app_start_type after unlock completes', () => {
      markLoginInteractionCompleted();

      const result = getLoginPerformanceTags(false);

      expect(result).toEqual({
        locked: false,
        app_start_type: LOGIN_APP_START_TYPE.WARM,
      });
    });
  });

  describe('getLoginInteractionEndData', () => {
    it('returns success with filled content_state by default', () => {
      const result = getLoginInteractionEndData();

      expect(result).toEqual({
        success: true,
        content_state: LOGIN_CONTENT_STATE.FILLED,
      });
    });

    it('returns the provided content_state', () => {
      const result = getLoginInteractionEndData(LOGIN_CONTENT_STATE.EMPTY);

      expect(result).toEqual({
        success: true,
        content_state: LOGIN_CONTENT_STATE.EMPTY,
      });
    });
  });
});
