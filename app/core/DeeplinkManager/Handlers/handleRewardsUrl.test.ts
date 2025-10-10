import { handleRewardsUrl } from './handleRewardsUrl';
import NavigationService from '../../NavigationService';
import Routes from '../../../constants/navigation/Routes';
import DevLogger from '../../SDKConnect/utils/DevLogger';

// Mock dependencies
jest.mock('../../NavigationService');
jest.mock('../../SDKConnect/utils/DevLogger');

describe('handleRewardsUrl', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup navigation mocks
    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    // Mock DevLogger
    (DevLogger.log as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('handleRewardsUrl', () => {
    it('should navigate to rewards view with referral code', async () => {
      await handleRewardsUrl({ rewardsPath: '?referral=code123' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW, {
        screen: Routes.REWARDS_VIEW,
        params: {
          isFromDeeplink: true,
          referral: 'code123',
        },
      });
    });

    it('should navigate to rewards view without referral code', async () => {
      await handleRewardsUrl({ rewardsPath: '' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW, {
        screen: Routes.REWARDS_VIEW,
        params: {
          isFromDeeplink: true,
        },
      });
    });

    it('should fallback to wallet view on error', async () => {
      // Mock error in navigation
      mockNavigate.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      await handleRewardsUrl({ rewardsPath: '?referral=code123' });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenLastCalledWith(Routes.WALLET_VIEW, {
        screen: Routes.WALLET_VIEW,
      });
    });
  });
});
