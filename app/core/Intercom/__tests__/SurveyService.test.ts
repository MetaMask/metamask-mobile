import SurveyService from '../SurveyService';
import IntercomService from '../IntercomService';
import { getIntercomFeatureFlags, isIntercomConfigured } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../IntercomService', () => ({
  __esModule: true,
  default: {
    isInitialized: jest.fn().mockReturnValue(false),
    initialize: jest.fn().mockResolvedValue(undefined),
    updateUserAttributes: jest.fn().mockResolvedValue(undefined),
    presentSurvey: jest.fn().mockResolvedValue(undefined),
    getAnonymousUUID: jest.fn().mockReturnValue('test-uuid-1234'),
    setAnonymousUUID: jest.fn(),
    rotateAnonymousUUID: jest.fn(),
  },
}));

jest.mock('../config', () => ({
  getIntercomFeatureFlags: jest.fn(),
  isIntercomConfigured: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../../locales/i18n', () => ({
  locale: 'en-US',
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.65.0'),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

describe('SurveyService', () => {
  const mockFlags = {
    surveys_enabled_mobile: true,
    support_enabled_mobile: true,
    kill_switch: false,
    min_orders_7d: 1,
    cooldown_days: 14,
    suppress_after_action_days: 30,
    cohorts: ['all'],
    locales: ['en'],
  };

  const mockSurveyContext = {
    surveyId: 'survey-123',
    ordersCompleted7d: 3,
    tradeSizeUsd: 500,
    network: 'ethereum',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getIntercomFeatureFlags as jest.Mock).mockResolvedValue(mockFlags);
    (isIntercomConfigured as jest.Mock).mockReturnValue(true);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('hasConsent', () => {
    it('returns false when no consent stored', async () => {
      const result = await SurveyService.hasConsent();

      expect(result).toBe(false);
    });

    it('returns true when consent is stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const result = await SurveyService.hasConsent();

      expect(result).toBe(true);
    });
  });

  describe('setConsent', () => {
    it('stores consent in AsyncStorage', async () => {
      await SurveyService.setConsent(true);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@intercom_survey_consent',
        'true',
      );
    });

    it('rotates anonymous UUID on opt-out', async () => {
      await SurveyService.setConsent(false);

      expect(IntercomService.rotateAnonymousUUID).toHaveBeenCalled();
    });

    it('does not rotate UUID on opt-in', async () => {
      await SurveyService.setConsent(true);

      expect(IntercomService.rotateAnonymousUUID).not.toHaveBeenCalled();
    });
  });

  describe('checkEligibility', () => {
    it('returns full eligibility when all criteria met', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@intercom_survey_consent') return Promise.resolve('true');
        return Promise.resolve(null);
      });

      const eligibility =
        await SurveyService.checkEligibility(mockSurveyContext);

      expect(eligibility).toEqual({
        hasConsent: true,
        meetsOrderThreshold: true,
        isInCooldown: false,
        isLocaleSupported: true,
        isInEligibleCohort: true,
      });
    });

    it('returns false for order threshold when not met', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
      (getIntercomFeatureFlags as jest.Mock).mockResolvedValue({
        ...mockFlags,
        min_orders_7d: 5,
      });

      const eligibility = await SurveyService.checkEligibility({
        ...mockSurveyContext,
        ordersCompleted7d: 2,
      });

      expect(eligibility.meetsOrderThreshold).toBe(false);
    });
  });

  describe('triggerSurvey', () => {
    it('does not trigger when Intercom not configured', async () => {
      (isIntercomConfigured as jest.Mock).mockReturnValue(false);

      const result = await SurveyService.triggerSurvey(mockSurveyContext);

      expect(result).toBe(false);
      expect(IntercomService.presentSurvey).not.toHaveBeenCalled();
    });

    it('does not trigger when kill switch is on', async () => {
      (getIntercomFeatureFlags as jest.Mock).mockResolvedValue({
        ...mockFlags,
        kill_switch: true,
      });

      const result = await SurveyService.triggerSurvey(mockSurveyContext);

      expect(result).toBe(false);
    });

    it('does not trigger when surveys are disabled', async () => {
      (getIntercomFeatureFlags as jest.Mock).mockResolvedValue({
        ...mockFlags,
        surveys_enabled_mobile: false,
      });

      const result = await SurveyService.triggerSurvey(mockSurveyContext);

      expect(result).toBe(false);
    });

    it('does not trigger without user consent', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('false');

      const result = await SurveyService.triggerSurvey(mockSurveyContext);

      expect(result).toBe(false);
    });

    it('triggers survey when all criteria met', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@intercom_survey_consent') return Promise.resolve('true');
        return Promise.resolve(null);
      });
      (IntercomService.isInitialized as jest.Mock).mockReturnValue(true);

      const result = await SurveyService.triggerSurvey(mockSurveyContext);

      expect(result).toBe(true);
      expect(IntercomService.presentSurvey).toHaveBeenCalledWith('survey-123');
    });

    it('initializes Intercom if not already initialized', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@intercom_survey_consent') return Promise.resolve('true');
        return Promise.resolve(null);
      });
      (IntercomService.isInitialized as jest.Mock).mockReturnValue(false);

      await SurveyService.triggerSurvey(mockSurveyContext);

      expect(IntercomService.initialize).toHaveBeenCalled();
    });

    it('updates user with bucketed metadata', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@intercom_survey_consent') return Promise.resolve('true');
        return Promise.resolve(null);
      });
      (IntercomService.isInitialized as jest.Mock).mockReturnValue(true);

      await SurveyService.triggerSurvey(mockSurveyContext);

      expect(IntercomService.updateUserAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          orders_completed_7d: '2-4', // 3 orders bucketed
          trade_size_usd_bucket: '500-1999', // $500 bucketed
          perps_user: true,
        }),
      );
    });
  });

  describe('cooldown management', () => {
    it('is in cooldown when impression is recent', async () => {
      const recentCooldown = {
        lastImpressionDate: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        lastActionDate: null,
        impressionCount90Days: 1,
        impressionTimestamps: [Date.now() - 5 * 24 * 60 * 60 * 1000],
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@intercom_survey_consent') return Promise.resolve('true');
        if (key === '@intercom_survey_cooldown')
          return Promise.resolve(JSON.stringify(recentCooldown));
        return Promise.resolve(null);
      });

      const eligibility =
        await SurveyService.checkEligibility(mockSurveyContext);

      expect(eligibility.isInCooldown).toBe(true);
    });

    it('is not in cooldown when impression is old', async () => {
      const oldCooldown = {
        lastImpressionDate: Date.now() - 20 * 24 * 60 * 60 * 1000, // 20 days ago
        lastActionDate: null,
        impressionCount90Days: 1,
        impressionTimestamps: [Date.now() - 20 * 24 * 60 * 60 * 1000],
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@intercom_survey_consent') return Promise.resolve('true');
        if (key === '@intercom_survey_cooldown')
          return Promise.resolve(JSON.stringify(oldCooldown));
        return Promise.resolve(null);
      });

      const eligibility =
        await SurveyService.checkEligibility(mockSurveyContext);

      expect(eligibility.isInCooldown).toBe(false);
    });

    it('respects 90-day impression cap', async () => {
      const maxImpressions = {
        lastImpressionDate: Date.now() - 20 * 24 * 60 * 60 * 1000,
        lastActionDate: null,
        impressionCount90Days: 3,
        impressionTimestamps: [
          Date.now() - 80 * 24 * 60 * 60 * 1000,
          Date.now() - 50 * 24 * 60 * 60 * 1000,
          Date.now() - 20 * 24 * 60 * 60 * 1000,
        ],
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@intercom_survey_consent') return Promise.resolve('true');
        if (key === '@intercom_survey_cooldown')
          return Promise.resolve(JSON.stringify(maxImpressions));
        return Promise.resolve(null);
      });

      const eligibility =
        await SurveyService.checkEligibility(mockSurveyContext);

      expect(eligibility.isInCooldown).toBe(true);
    });
  });

  describe('order bucketing', () => {
    // Note: We only test orders >= 1 here because 0 orders won't trigger a survey
    // (doesn't meet min_orders threshold). The bucketing logic is still tested.
    it.each([
      [1, '1'],
      [2, '2-4'],
      [4, '2-4'],
      [5, '5+'],
      [100, '5+'],
    ])('buckets %i orders as %s', async (orders, expected) => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@intercom_survey_consent') return Promise.resolve('true');
        return Promise.resolve(null);
      });
      (IntercomService.isInitialized as jest.Mock).mockReturnValue(true);

      await SurveyService.triggerSurvey({
        ...mockSurveyContext,
        ordersCompleted7d: orders,
      });

      expect(IntercomService.updateUserAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          orders_completed_7d: expected,
        }),
      );
    });
  });

  describe('trade size bucketing', () => {
    it.each([
      [50, '0-99'],
      [100, '100-499'],
      [500, '500-1999'],
      [2000, '2000-9999'],
      [10000, '10000+'],
    ])('buckets $%i as %s', async (size, expected) => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@intercom_survey_consent') return Promise.resolve('true');
        return Promise.resolve(null);
      });
      (IntercomService.isInitialized as jest.Mock).mockReturnValue(true);

      await SurveyService.triggerSurvey({
        ...mockSurveyContext,
        tradeSizeUsd: size,
      });

      expect(IntercomService.updateUserAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          trade_size_usd_bucket: expected,
        }),
      );
    });
  });
});
