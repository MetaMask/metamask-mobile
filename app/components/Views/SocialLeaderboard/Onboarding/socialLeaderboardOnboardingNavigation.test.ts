import Routes from '../../../../constants/navigation/Routes';
import ReduxService from '../../../../core/redux';
import type { RootState } from '../../../../reducers';
import StorageWrapper from '../../../../store/storage-wrapper';
import { SOCIAL_LEADERBOARD_ONBOARDING_SHOWN } from '../../../../constants/storage';
import { selectAiSocialLeaderboardOnboardingEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import {
  hasSeenSocialLeaderboardOnboarding,
  navigateToSocialLeaderboard,
  resetSocialLeaderboardOnboardingSeen,
  shouldShowSocialLeaderboardOnboarding,
} from './socialLeaderboardOnboardingNavigation';

jest.mock('../../../../core/redux', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn() } },
}));

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: { getItemSync: jest.fn(), removeItem: jest.fn() },
}));

jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectAiSocialLeaderboardOnboardingEnabled: jest.fn(),
  }),
);

const mockGetState = jest.mocked(ReduxService.store.getState);
const mockGetItemSync = jest.mocked(StorageWrapper.getItemSync);
const mockRemoveItem = jest.mocked(StorageWrapper.removeItem);
const mockOnboardingEnabled = jest.mocked(
  selectAiSocialLeaderboardOnboardingEnabled,
);

describe('socialLeaderboardOnboardingNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({} as unknown as RootState);
    mockOnboardingEnabled.mockReturnValue(true);
    mockGetItemSync.mockReturnValue(null);
  });

  describe('shouldShowSocialLeaderboardOnboarding', () => {
    it('returns true when enabled and not previously seen', () => {
      mockGetItemSync.mockReturnValue(null);
      expect(shouldShowSocialLeaderboardOnboarding()).toBe(true);
      expect(mockGetItemSync).toHaveBeenCalledWith(
        SOCIAL_LEADERBOARD_ONBOARDING_SHOWN,
      );
    });

    it('returns false when the onboarding has already been seen', () => {
      mockGetItemSync.mockReturnValue('true');
      expect(shouldShowSocialLeaderboardOnboarding()).toBe(false);
    });

    it('returns false when the onboarding flag is off (without reading storage)', () => {
      mockOnboardingEnabled.mockReturnValue(false);
      expect(shouldShowSocialLeaderboardOnboarding()).toBe(false);
      expect(mockGetItemSync).not.toHaveBeenCalled();
    });
  });

  describe('navigateToSocialLeaderboard', () => {
    it('navigates to the onboarding for a first-time user', () => {
      mockGetItemSync.mockReturnValue(null);
      const navigate = jest.fn();

      navigateToSocialLeaderboard(navigate, { source: 'home_carousel' });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.ONBOARDING,
      );
    });

    it('navigates to the leaderboard with the source when onboarding is not due', () => {
      mockGetItemSync.mockReturnValue('true');
      const navigate = jest.fn();

      navigateToSocialLeaderboard(navigate, { source: 'home_carousel' });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL_LEADERBOARD.VIEW, {
        source: 'home_carousel',
      });
    });

    it('navigates to the leaderboard without params when none are provided', () => {
      mockGetItemSync.mockReturnValue('true');
      const navigate = jest.fn();

      navigateToSocialLeaderboard(navigate);

      expect(navigate).toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.VIEW,
        undefined,
      );
    });
  });

  describe('hasSeenSocialLeaderboardOnboarding', () => {
    it('returns true when the seen flag is persisted', () => {
      mockGetItemSync.mockReturnValue('true');
      expect(hasSeenSocialLeaderboardOnboarding()).toBe(true);
      expect(mockGetItemSync).toHaveBeenCalledWith(
        SOCIAL_LEADERBOARD_ONBOARDING_SHOWN,
      );
    });

    it('returns false when the seen flag is absent', () => {
      mockGetItemSync.mockReturnValue(null);
      expect(hasSeenSocialLeaderboardOnboarding()).toBe(false);
    });
  });

  describe('resetSocialLeaderboardOnboardingSeen', () => {
    it('removes the persisted seen flag', async () => {
      mockRemoveItem.mockResolvedValue(undefined);

      await resetSocialLeaderboardOnboardingSeen();

      expect(mockRemoveItem).toHaveBeenCalledWith(
        SOCIAL_LEADERBOARD_ONBOARDING_SHOWN,
      );
    });
  });
});
