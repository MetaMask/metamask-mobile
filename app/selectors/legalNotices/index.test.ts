import {
  shouldShowNewPrivacyToastSelector,
  selectShouldShowPna25Notice,
  selectIsPna25Acknowledged,
} from '.';
import { RootState } from '../../reducers';
import { selectIsPna25FlagEnabled } from '../featureFlagController/legalNotices';
import { MetaMetrics } from '../../core/Analytics';

jest.mock('../featureFlagController/legalNotices');
jest.mock('../../core/Analytics');

const mockSelectIsPna25FlagEnabled =
  selectIsPna25FlagEnabled as jest.MockedFunction<
    typeof selectIsPna25FlagEnabled
  >;
const mockMetaMetrics = MetaMetrics as jest.Mocked<typeof MetaMetrics>;

describe('legalNotices selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shouldShowNewPrivacyToastSelector', () => {
    const createMockState = (
      overrides: Partial<RootState['legalNotices']> = {},
    ): RootState =>
      ({
        legalNotices: {
          isPna25Acknowledged: false,
          newPrivacyPolicyToastClickedOrClosed: false,
          newPrivacyPolicyToastShownDate: null,
          ...overrides,
        },
      }) as RootState;

    it('returns false when privacy policy toast was clicked or closed', () => {
      const state = createMockState({
        newPrivacyPolicyToastClickedOrClosed: true,
      });

      const result = shouldShowNewPrivacyToastSelector(state);

      expect(result).toBe(false);
    });

    it('returns true when past policy date and not shown before', () => {
      // The selector checks if current date (Nov 2025) >= policy date (June 2024)
      // Since we're past the policy date, and toast hasn't been shown, it should return true
      const state = createMockState({
        newPrivacyPolicyToastShownDate: null,
        newPrivacyPolicyToastClickedOrClosed: false,
      });

      const result = shouldShowNewPrivacyToastSelector(state);

      // This test may return false if we're before June 18, 2024
      // The selector uses a hardcoded date of June 18, 2024
      const currentDate = new Date(Date.now());
      const newPrivacyPolicyDate = new Date('2024-06-18T12:00:00Z');
      const isPastPolicyDate = currentDate >= newPrivacyPolicyDate;

      expect(result).toBe(isPastPolicyDate);
    });

    it('returns false when shown date is more than one day old', () => {
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
      const state = createMockState({
        newPrivacyPolicyToastShownDate: twoDaysAgo,
        newPrivacyPolicyToastClickedOrClosed: false,
      });

      const result = shouldShowNewPrivacyToastSelector(state);

      expect(result).toBe(false);
    });

    it('returns true when shown date is within one day and past policy date', () => {
      const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
      const state = createMockState({
        newPrivacyPolicyToastShownDate: twelveHoursAgo,
        newPrivacyPolicyToastClickedOrClosed: false,
      });

      const result = shouldShowNewPrivacyToastSelector(state);

      // This returns true only if we're past June 18, 2024 AND shown date is recent
      const currentDate = new Date(Date.now());
      const newPrivacyPolicyDate = new Date('2024-06-18T12:00:00Z');
      const isPastPolicyDate = currentDate >= newPrivacyPolicyDate;

      expect(result).toBe(isPastPolicyDate);
    });
  });

  describe('selectShouldShowPna25Notice', () => {
    const createMockState = (overrides: {
      completedOnboarding?: boolean;
      isPna25Acknowledged?: boolean;
    }): RootState =>
      ({
        onboarding: {
          completedOnboarding: overrides.completedOnboarding ?? true,
        },
        legalNotices: {
          isPna25Acknowledged: overrides.isPna25Acknowledged ?? false,
          newPrivacyPolicyToastClickedOrClosed: false,
          newPrivacyPolicyToastShownDate: null,
        },
      }) as RootState;

    beforeEach(() => {
      mockMetaMetrics.getInstance.mockReturnValue({
        isEnabled: jest.fn().mockReturnValue(true),
      } as never);
    });

    it('returns false when onboarding is not completed', () => {
      const state = createMockState({ completedOnboarding: false });
      mockSelectIsPna25FlagEnabled.mockReturnValue(true);

      const result = selectShouldShowPna25Notice(state);

      expect(result).toBe(false);
    });

    it('returns false when PNA25 feature flag is disabled', () => {
      const state = createMockState({});
      mockSelectIsPna25FlagEnabled.mockReturnValue(false);

      const result = selectShouldShowPna25Notice(state);

      expect(result).toBe(false);
    });

    it('returns false when PNA25 is already acknowledged', () => {
      const state = createMockState({ isPna25Acknowledged: true });
      mockSelectIsPna25FlagEnabled.mockReturnValue(true);

      const result = selectShouldShowPna25Notice(state);

      expect(result).toBe(false);
    });

    it('returns false when MetaMetrics is disabled', () => {
      const state = createMockState({});
      mockSelectIsPna25FlagEnabled.mockReturnValue(true);
      mockMetaMetrics.getInstance.mockReturnValue({
        isEnabled: jest.fn().mockReturnValue(false),
      } as never);

      const result = selectShouldShowPna25Notice(state);

      expect(result).toBe(false);
    });

    it('returns true when all conditions are met', () => {
      const state = createMockState({});
      mockSelectIsPna25FlagEnabled.mockReturnValue(true);

      const result = selectShouldShowPna25Notice(state);

      expect(result).toBe(true);
    });
  });

  describe('selectIsPna25Acknowledged', () => {
    const createMockState = (isPna25Acknowledged: boolean): RootState =>
      ({
        legalNotices: {
          isPna25Acknowledged,
          newPrivacyPolicyToastClickedOrClosed: false,
          newPrivacyPolicyToastShownDate: null,
        },
      }) as RootState;

    it('returns true when PNA25 is acknowledged', () => {
      const state = createMockState(true);

      const result = selectIsPna25Acknowledged(state);

      expect(result).toBe(true);
    });

    it('returns false when PNA25 is not acknowledged', () => {
      const state = createMockState(false);

      const result = selectIsPna25Acknowledged(state);

      expect(result).toBe(false);
    });
  });
});
