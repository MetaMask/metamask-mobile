import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import React from 'react';
import { useRewardsSubscription } from './useRewardsSubscription';
import type {
  SubscriptionDto,
  RewardsControllerState,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import type { RootState } from '../../../../reducers';
import { EngineState } from '../../../../core/Engine';

// Mock Redux store structure
const createMockStore = (rewardsState: Partial<RewardsControllerState>) => {
  const mockState: Partial<RootState> = {
    engine: {
      backgroundState: {
        RewardsController: {
          lastAuthenticatedAccount: null,
          lastAuthTime: 0,
          subscription: null,
          ...rewardsState,
        },
      } as EngineState,
    },
  };

  return createStore(() => mockState);
};

// Mock subscription data
const mockSubscription: SubscriptionDto = {
  id: 'sub-12345678-abcd',
  referralCode: 'METAMASK123',
  customField: 'test-value',
};

const mockAccountAddress = '0x1234567890abcdef1234567890abcdef12345678';

// Helper function to render hook with Redux provider
const renderWithRedux = (
  rewardsState: Partial<RewardsControllerState> = {},
) => {
  const store = createMockStore(rewardsState);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return renderHook(() => useRewardsSubscription(), { wrapper });
};

describe('useRewardsSubscription', () => {
  describe('Initial state', () => {
    it('returns null values when no subscription exists', () => {
      // Act
      const { result } = renderWithRedux();

      // Assert
      expect(result.current.subscription).toBeNull();
    });

    it('returns null values when rewards state is undefined', () => {
      // Arrange - create store with undefined RewardsController
      const mockState: Partial<RootState> = {
        engine: {
          backgroundState: {},
        } as never,
      };
      const store = createStore(() => mockState);
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

      // Act
      const { result } = renderHook(() => useRewardsSubscription(), {
        wrapper,
      });

      // Assert
      expect(result.current.subscription).toBeNull();
    });
  });

  describe('Authenticated state', () => {
    it('returns subscription data when user is authenticated', () => {
      // Arrange
      const rewardsState: RewardsControllerState = {
        subscription: mockSubscription,
        lastAuthenticatedAccount: mockAccountAddress,
        lastAuthTime: Date.now(),
      };

      // Act
      const { result } = renderWithRedux(rewardsState);

      // Assert
      expect(result.current.subscription).toEqual(mockSubscription);
    });

    it('returns correct subscription when subscription exists', () => {
      // Arrange
      const customSubscription = { ...mockSubscription, id: 'custom-sub-id' };
      const rewardsState: RewardsControllerState = {
        subscription: customSubscription,
        lastAuthenticatedAccount: mockAccountAddress,
        lastAuthTime: Date.now(),
      };

      // Act
      const { result } = renderWithRedux(rewardsState);

      // Assert
      expect(result.current.subscription).toEqual(customSubscription);
    });

    describe('Unauthenticated state scenarios', () => {
      it('returns false for isAuthenticated when subscription is null', () => {
        // Arrange
        const rewardsState: RewardsControllerState = {
          subscription: null,
          lastAuthenticatedAccount: mockAccountAddress,
          lastAuthTime: Date.now(),
        };

        // Act
        const { result } = renderWithRedux(rewardsState);

        // Assert
        expect(result.current.subscription).toBeNull();
      });

      it('handles case where lastAuthenticatedAccount exists but no subscription', () => {
        // Arrange - user attempted auth but failed/expired
        const rewardsState: RewardsControllerState = {
          subscription: null,
          lastAuthenticatedAccount: mockAccountAddress,
          lastAuthTime: Date.now() - 1000 * 60 * 60, // 1 hour ago
        };

        // Act
        const { result } = renderWithRedux(rewardsState);

        // Assert
        expect(result.current.subscription).toBeNull();
      });
    });

    describe('State behavior with different scenarios', () => {
      it('handles different state combinations correctly', () => {
        // Test various state combinations
        const testCases = [
          {
            description: 'authenticated with subscription and account',
            state: {
              subscription: mockSubscription,
              lastAuthenticatedAccount: mockAccountAddress,
              lastAuthTime: Date.now(),
            },
            expected: {
              subscription: mockSubscription,
            },
          },
          {
            description: 'unauthenticated with account but no subscription',
            state: {
              subscription: null,
              lastAuthenticatedAccount: mockAccountAddress,
              lastAuthTime: Date.now(),
            },
            expected: {
              subscription: null,
            },
          },
          {
            description: 'subscription without account (edge case)',
            state: {
              subscription: mockSubscription,
              lastAuthenticatedAccount: null,
              lastAuthTime: 0,
            },
            expected: {
              subscription: mockSubscription,
            },
          },
        ];

        testCases.forEach(({ state, expected }) => {
          // Act
          const { result } = renderWithRedux(state);

          // Assert
          expect(result.current.subscription).toEqual(expected.subscription);
        });
      });

      it('handles malformed subscription data gracefully', () => {
        // Arrange - subscription with missing required fields
        const malformedSubscription = {
          // Missing 'id' field
          referralCode: 'METAMASK123',
        } as SubscriptionDto;

        const rewardsState: RewardsControllerState = {
          subscription: malformedSubscription,
          lastAuthenticatedAccount: mockAccountAddress,
          lastAuthTime: Date.now(),
        };

        // Act
        const { result } = renderWithRedux(rewardsState);

        // Assert
        expect(result.current.subscription).toEqual(malformedSubscription);
      });
    });

    describe('Return value consistency', () => {
      it('always returns consistent data structure', () => {
        // Test that the hook always returns the same structure
        const states = [
          {
            subscription: null,
            lastAuthenticatedAccount: null,
            lastAuthTime: 0,
          },
          {
            subscription: mockSubscription,
            lastAuthenticatedAccount: mockAccountAddress,
            lastAuthTime: Date.now(),
          },
        ];

        states.forEach((state) => {
          // Act
          const { result } = renderWithRedux(state);

          // Assert - should always have these properties
          expect(result.current).toHaveProperty('subscription');
        });
      });

      it('maintains correct type structure', () => {
        // Arrange
        const { result } = renderWithRedux();

        // Assert - check return value types
        expect(typeof result.current.subscription).toBe('object');
      });
    });
  });
});
