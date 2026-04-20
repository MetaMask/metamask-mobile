import { handleRewardsUrl } from '../handleRewardsUrl';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import ReduxService from '../../../../redux';
import {
  setOnboardingReferralCode,
  setPendingDeeplink,
} from '../../../../../reducers/rewards';

// Mock dependencies
jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');
jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      dispatch: jest.fn(),
    },
  },
}));

jest.mock('../../../../../reducers/rewards', () => ({
  setOnboardingReferralCode: jest.fn((code: string | null) => ({
    type: 'SET_ONBOARDING_REFERRAL_CODE',
    payload: code,
  })),
  setPendingDeeplink: jest.fn(
    (deeplink: { page?: string; campaign?: string } | null) => ({
      type: 'SET_PENDING_DEEPLINK',
      payload: deeplink,
    }),
  ),
}));

describe('handleRewardsUrl', () => {
  let mockNavigate: jest.Mock;
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup navigation mocks
    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    // Setup store mock
    mockDispatch = ReduxService.store.dispatch as jest.Mock;

    // Mock loggers
    (DevLogger.log as jest.Mock) = jest.fn();
    (Logger.log as jest.Mock) = jest.fn();
  });

  describe('with referral code', () => {
    it('dispatches referral code and navigates to rewards view', async () => {
      await handleRewardsUrl({ rewardsPath: '?referral=code123' });

      expect(setOnboardingReferralCode).toHaveBeenCalledWith('code123');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_ONBOARDING_REFERRAL_CODE',
        payload: 'code123',
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('extracts referral code from full URL path', async () => {
      await handleRewardsUrl({ rewardsPath: 'rewards?referral=abc456' });

      expect(setOnboardingReferralCode).toHaveBeenCalledWith('abc456');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_ONBOARDING_REFERRAL_CODE',
        payload: 'abc456',
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('handles multiple URL parameters', async () => {
      await handleRewardsUrl({
        rewardsPath: '?referral=xyz789&other=param',
      });

      expect(setOnboardingReferralCode).toHaveBeenCalledWith('xyz789');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_ONBOARDING_REFERRAL_CODE',
        payload: 'xyz789',
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });
  });

  describe('without referral code', () => {
    it('clears referral code and pending deeplink, then navigates to rewards view', async () => {
      await handleRewardsUrl({ rewardsPath: '' });

      expect(setOnboardingReferralCode).toHaveBeenCalledWith(null);
      expect(setPendingDeeplink).toHaveBeenCalledWith(null);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('clears referral code and pending deeplink when URL has no parameters', async () => {
      await handleRewardsUrl({ rewardsPath: 'rewards' });

      expect(setOnboardingReferralCode).toHaveBeenCalledWith(null);
      expect(setPendingDeeplink).toHaveBeenCalledWith(null);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('clears referral code and pending deeplink when referral parameter is empty', async () => {
      await handleRewardsUrl({ rewardsPath: '?referral=' });

      expect(setOnboardingReferralCode).toHaveBeenCalledWith(null);
      expect(setPendingDeeplink).toHaveBeenCalledWith(null);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });
  });

  describe('with page/campaign navigation params', () => {
    it('dispatches pending deeplink and navigates to rewards view with page=campaigns param', async () => {
      await handleRewardsUrl({ rewardsPath: '?page=campaigns' });

      expect(setPendingDeeplink).toHaveBeenCalledWith({
        page: 'campaigns',
        campaign: undefined,
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_PENDING_DEEPLINK',
        payload: { page: 'campaigns', campaign: undefined },
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('dispatches pending deeplink and navigates to rewards view with campaign=ondo param', async () => {
      await handleRewardsUrl({ rewardsPath: '?campaign=ondo' });

      expect(setPendingDeeplink).toHaveBeenCalledWith({
        page: undefined,
        campaign: 'ondo',
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('dispatches pending deeplink and navigates to rewards view with campaign=season1 param', async () => {
      await handleRewardsUrl({ rewardsPath: '?campaign=season1' });

      expect(setPendingDeeplink).toHaveBeenCalledWith({
        page: undefined,
        campaign: 'season1',
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('dispatches pending deeplink and navigates to rewards view with page=musd param', async () => {
      await handleRewardsUrl({ rewardsPath: '?page=musd' });

      expect(setPendingDeeplink).toHaveBeenCalledWith({
        page: 'musd',
        campaign: undefined,
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('dispatches pending deeplink and navigates to rewards view with page=benefits param', async () => {
      await handleRewardsUrl({ rewardsPath: '?page=benefits' });

      expect(setPendingDeeplink).toHaveBeenCalledWith({
        page: 'benefits',
        campaign: undefined,
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('clears pending deeplink for unknown page value', async () => {
      await handleRewardsUrl({ rewardsPath: '?page=unknown' });

      expect(setPendingDeeplink).toHaveBeenCalledWith(null);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('clears pending deeplink for unknown campaign value', async () => {
      await handleRewardsUrl({ rewardsPath: '?campaign=unknown' });

      expect(setPendingDeeplink).toHaveBeenCalledWith(null);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('dispatches referral code and pending deeplink when both are present', async () => {
      await handleRewardsUrl({
        rewardsPath: '?referral=abc123&page=campaigns',
      });

      expect(setOnboardingReferralCode).toHaveBeenCalledWith('abc123');
      expect(setPendingDeeplink).toHaveBeenCalledWith({
        page: 'campaigns',
        campaign: undefined,
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });
  });

  describe('error handling', () => {
    it('falls back to wallet view when navigation fails', async () => {
      mockNavigate.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      await handleRewardsUrl({ rewardsPath: '?referral=code123' });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenLastCalledWith(Routes.WALLET_VIEW, {
        screen: Routes.WALLET_VIEW,
      });
    });

    it('falls back to wallet view when dispatch fails', async () => {
      mockDispatch.mockImplementationOnce(() => {
        throw new Error('Dispatch error');
      });

      await handleRewardsUrl({ rewardsPath: '?referral=code123' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW, {
        screen: Routes.WALLET_VIEW,
      });
    });

    it('logs error details when handling fails', async () => {
      const testError = new Error('Test error');
      mockNavigate.mockImplementationOnce(() => {
        throw testError;
      });

      await handleRewardsUrl({ rewardsPath: '?referral=code123' });

      expect(DevLogger.log).toHaveBeenCalledWith(
        'Failed to handle rewards deeplink:',
        testError,
      );
    });
  });
});
