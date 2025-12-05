import { handleRewardsUrl } from '../handleRewardsUrl';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { store } from '../../../../../store';
import { setOnboardingReferralCode } from '../../../../../reducers/rewards';

// Mock dependencies
jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');
jest.mock('../../../../../store', () => ({
  store: {
    dispatch: jest.fn(),
  },
}));
jest.mock('../../../../../reducers/rewards', () => ({
  setOnboardingReferralCode: jest.fn((code: string | null) => ({
    type: 'SET_ONBOARDING_REFERRAL_CODE',
    payload: code,
  })),
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
    mockDispatch = store.dispatch as jest.Mock;

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
    it('clears referral code and navigates to rewards view', async () => {
      await handleRewardsUrl({ rewardsPath: '' });

      expect(setOnboardingReferralCode).toHaveBeenCalledWith(null);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_ONBOARDING_REFERRAL_CODE',
        payload: null,
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('clears referral code when URL has no parameters', async () => {
      await handleRewardsUrl({ rewardsPath: 'rewards' });

      expect(setOnboardingReferralCode).toHaveBeenCalledWith(null);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_ONBOARDING_REFERRAL_CODE',
        payload: null,
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('clears referral code when referral parameter is empty', async () => {
      await handleRewardsUrl({ rewardsPath: '?referral=' });

      expect(setOnboardingReferralCode).toHaveBeenCalledWith(null);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_ONBOARDING_REFERRAL_CODE',
        payload: null,
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
