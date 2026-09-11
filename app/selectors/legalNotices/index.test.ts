import {
  shouldShowNewPrivacyToastSelector,
  selectShouldShowPna25Notice,
  selectIsPna25Acknowledged,
  selectShouldShowArcUsageNotice,
} from '.';
import { RootState } from '../../reducers';
import { analytics } from '../../util/analytics/analytics';
import { NETWORK_CHAIN_ID } from '../../util/networks/customNetworks';

jest.mock('../../util/analytics/analytics');

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
      jest.mocked(analytics.isEnabled).mockReturnValue(true);
    });

    it('returns false when onboarding is not completed', () => {
      const state = createMockState({ completedOnboarding: false });

      const result = selectShouldShowPna25Notice(state);

      expect(result).toBe(false);
    });

    it('returns false when PNA25 is already acknowledged', () => {
      const state = createMockState({ isPna25Acknowledged: true });

      const result = selectShouldShowPna25Notice(state);

      expect(result).toBe(false);
    });

    it('returns false when analytics is disabled', () => {
      const state = createMockState({});
      jest.mocked(analytics.isEnabled).mockReturnValue(false);

      const result = selectShouldShowPna25Notice(state);

      expect(result).toBe(false);
    });

    it('returns true when all conditions are met', () => {
      const state = createMockState({});

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

  describe('selectShouldShowArcUsageNotice', () => {
    const ACCOUNT = '0x0DCD5D886577d5081B0c52e242Ef29E70Be3E7bc';
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const ARC_ERC20 = '0x3600000000000000000000000000000000000000';

    const createArcState = ({
      arcBalances,
      otherChainBalances,
      arcUsageNoticeShown = false,
    }: {
      arcBalances?: Record<string, string>;
      otherChainBalances?: Record<string, string>;
      arcUsageNoticeShown?: boolean;
    }): RootState =>
      ({
        legalNotices: {
          isPna25Acknowledged: false,
          newPrivacyPolicyToastClickedOrClosed: false,
          newPrivacyPolicyToastShownDate: null,
          arcUsageNoticeShown,
        },
        engine: {
          backgroundState: {
            TokenBalancesController: {
              tokenBalances: {
                [ACCOUNT]: {
                  ...(arcBalances
                    ? { [NETWORK_CHAIN_ID.ARC]: arcBalances }
                    : {}),
                  ...(otherChainBalances ? { '0x1': otherChainBalances } : {}),
                },
              },
            },
            AssetsController: {
              assetsInfo: {},
              assetsBalance: {},
              customAssets: {},
            },
            AccountsController: { internalAccounts: { accounts: {} } },
            RemoteFeatureFlagController: { remoteFeatureFlags: {} },
          },
        },
      }) as unknown as RootState;

    it('returns true when the native Arc balance is non-zero', () => {
      const state = createArcState({
        arcBalances: { [ZERO_ADDRESS]: '0xde0b6b3a7640000' },
      });

      const result = selectShouldShowArcUsageNotice(state);

      expect(result).toBe(true);
    });

    it('returns true when an Arc token balance is non-zero and native is zero', () => {
      const state = createArcState({
        arcBalances: {
          [ZERO_ADDRESS]: '0x0',
          [ARC_ERC20]: '0xde0b6b3a7640000',
        },
      });

      const result = selectShouldShowArcUsageNotice(state);

      expect(result).toBe(true);
    });

    it('returns false when every Arc balance is zero', () => {
      const state = createArcState({
        arcBalances: { [ZERO_ADDRESS]: '0x0', [ARC_ERC20]: '0x0' },
      });

      const result = selectShouldShowArcUsageNotice(state);

      expect(result).toBe(false);
    });

    it('returns false when Arc has no balances at all', () => {
      const state = createArcState({});

      const result = selectShouldShowArcUsageNotice(state);

      expect(result).toBe(false);
    });

    it('returns false when the non-zero balance is on another chain', () => {
      const state = createArcState({
        otherChainBalances: { [ZERO_ADDRESS]: '0xde0b6b3a7640000' },
      });

      const result = selectShouldShowArcUsageNotice(state);

      expect(result).toBe(false);
    });

    it('returns false once the notice was shown', () => {
      const state = createArcState({
        arcBalances: { [ZERO_ADDRESS]: '0xde0b6b3a7640000' },
        arcUsageNoticeShown: true,
      });

      const result = selectShouldShowArcUsageNotice(state);

      expect(result).toBe(false);
    });
  });
});
