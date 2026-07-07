import {
  ACTIVITY_REDESIGN_DETAILS_PAGES_FLAG_NAME,
  ACTIVITY_REDESIGN_LIST_ITEMS_FLAG_NAME,
  selectIsActivityRedesignEnabled,
  selectIsTransactionsRedesignEnabled,
} from './index';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.60.0'),
}));

describe('activityRedesign selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectIsActivityRedesignEnabled', () => {
    it('supports the existing boolean list-items flag', () => {
      const result = selectIsActivityRedesignEnabled.resultFunc({
        [ACTIVITY_REDESIGN_LIST_ITEMS_FLAG_NAME]: true,
      });

      expect(result).toBe(true);
    });

    it('supports a version-gated list-items flag', () => {
      const result = selectIsActivityRedesignEnabled.resultFunc({
        [ACTIVITY_REDESIGN_LIST_ITEMS_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '7.60.0',
        },
      });

      expect(result).toBe(true);
    });

    it('supports a rollout-wrapped version-gated list-items flag', () => {
      const result = selectIsActivityRedesignEnabled.resultFunc({
        [ACTIVITY_REDESIGN_LIST_ITEMS_FLAG_NAME]: {
          name: 'TMCU-854',
          value: {
            enabled: true,
            minimumVersion: '7.60.0',
          },
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when the list-items version requirement fails', () => {
      const result = selectIsActivityRedesignEnabled.resultFunc({
        [ACTIVITY_REDESIGN_LIST_ITEMS_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });

      expect(result).toBe(false);
    });
  });

  describe('selectIsTransactionsRedesignEnabled', () => {
    it('supports the existing boolean details-pages flag', () => {
      const result = selectIsTransactionsRedesignEnabled.resultFunc(true, {
        [ACTIVITY_REDESIGN_DETAILS_PAGES_FLAG_NAME]: true,
      });

      expect(result).toBe(true);
    });

    it('supports a version-gated details-pages flag', () => {
      const result = selectIsTransactionsRedesignEnabled.resultFunc(true, {
        [ACTIVITY_REDESIGN_DETAILS_PAGES_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '7.60.0',
        },
      });

      expect(result).toBe(true);
    });

    it('supports a rollout-wrapped version-gated details-pages flag', () => {
      const result = selectIsTransactionsRedesignEnabled.resultFunc(true, {
        [ACTIVITY_REDESIGN_DETAILS_PAGES_FLAG_NAME]: {
          name: 'TMCU-864',
          value: {
            enabled: true,
            minimumVersion: '7.60.0',
          },
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when list-items redesign is disabled', () => {
      const result = selectIsTransactionsRedesignEnabled.resultFunc(false, {
        [ACTIVITY_REDESIGN_DETAILS_PAGES_FLAG_NAME]: true,
      });

      expect(result).toBe(false);
    });

    it('returns false when the details-pages version requirement fails', () => {
      const result = selectIsTransactionsRedesignEnabled.resultFunc(true, {
        [ACTIVITY_REDESIGN_DETAILS_PAGES_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });

      expect(result).toBe(false);
    });
  });
});
