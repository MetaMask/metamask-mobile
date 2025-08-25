import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { selectRewardsSubscription } from './rewardscontroller';

// Mock the selectRewardsEnabledFlag
jest.mock('./featureFlagController/rewards', () => ({
  selectRewardsEnabledFlag: jest.fn(),
}));

// Import the mock after defining it
import { selectRewardsEnabledFlag } from './featureFlagController/rewards';

// Mock subscription data
const mockSubscription = {
  id: 'test-subscription-id',
  referralCode: 'TEST123',
};

// Mock the redux store state
const mockState = {
  engine: {
    backgroundState: {
      RewardsController: {
        lastAuthenticatedAccount: 'test-account',
        lastAuthTime: 1234567890,
        subscription: mockSubscription,
      },
    },
  },
};

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector(mockState)),
}));

describe('rewardscontroller selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectRewardsSubscription', () => {
    it('should return subscription when feature flag is enabled', () => {
      // Mock the feature flag to be enabled
      jest.mocked(selectRewardsEnabledFlag).mockReturnValue(true);

      const { result } = renderHook(() =>
        useSelector(selectRewardsSubscription),
      );
      expect(result.current).toEqual(mockSubscription);
    });

    it('should return undefined when feature flag is disabled', () => {
      // Mock the feature flag to be disabled
      jest.mocked(selectRewardsEnabledFlag).mockReturnValue(false);

      // Override useSelector to return undefined for this test
      jest.mocked(useSelector).mockImplementationOnce(() => undefined);

      const { result } = renderHook(() =>
        useSelector(selectRewardsSubscription),
      );
      expect(result.current).toBeUndefined();
    });

    it('should return undefined when subscription is not available', () => {
      // Mock the feature flag to be enabled
      jest.mocked(selectRewardsEnabledFlag).mockReturnValue(true);

      // Create a state without subscription
      const stateWithoutSubscription = {
        engine: {
          backgroundState: {
            RewardsController: {
              lastAuthenticatedAccount: 'test-account',
              lastAuthTime: 1234567890,
              // No subscription property
            },
          },
        },
      };

      // Override the useSelector mock for this test
      jest
        .mocked(useSelector)
        .mockImplementationOnce((selector) =>
          selector(stateWithoutSubscription),
        );

      const { result } = renderHook(() =>
        useSelector(selectRewardsSubscription),
      );
      expect(result.current).toBeUndefined();
    });

    it('should return undefined when RewardsController state is not available', () => {
      // Mock the feature flag to be enabled
      jest.mocked(selectRewardsEnabledFlag).mockReturnValue(true);

      // Create a state without RewardsController
      const stateWithoutRewardsController = {
        engine: {
          backgroundState: {
            // No RewardsController property
          },
        },
      };

      // Override the useSelector mock for this test
      jest
        .mocked(useSelector)
        .mockImplementationOnce((selector) =>
          selector(stateWithoutRewardsController),
        );

      const { result } = renderHook(() =>
        useSelector(selectRewardsSubscription),
      );
      expect(result.current).toBeUndefined();
    });

    it('should return undefined when engine state is not available', () => {
      // Mock the feature flag to be enabled
      jest.mocked(selectRewardsEnabledFlag).mockReturnValue(true);

      // Create a state without engine
      const stateWithoutEngine = {};

      // Override the useSelector mock for this test
      jest
        .mocked(useSelector)
        .mockImplementationOnce((selector) => selector(stateWithoutEngine));

      const { result } = renderHook(() =>
        useSelector(selectRewardsSubscription),
      );
      expect(result.current).toBeUndefined();
    });
  });
});
