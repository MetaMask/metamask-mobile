import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import React from 'react';
import { useRewardsStore } from './useRewardsStore';
import type { RootState } from '../../../../reducers';
import type { RewardsState } from '../../../../reducers/rewards';
import { RewardsTab } from '../../../../reducers/rewards/types';

// Mock Redux store structure
const createMockStore = (rewardsState: Partial<RewardsState>) => {
  const mockState: Partial<RootState> = {
    rewards: {
      activeTab: null,
      subscriptionId: null,
      currentTierId: null,
      balanceTotal: null,
      balanceRefereePortion: null,
      balanceUpdatedAt: null,
      referralCode: null,
      refereeCount: 0,
      seasonStatusLoading: false,
      ...rewardsState,
    },
  };

  return createStore(() => mockState as RootState);
};

// Helper function to render hook with Redux provider
const renderWithRedux = (rewardsState: Partial<RewardsState> = {}) => {
  const store = createMockStore(rewardsState);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return renderHook(() => useRewardsStore(), { wrapper });
};

describe('useRewardsStore', () => {
  describe('Initial state', () => {
    it('returns default values when state is empty', () => {
      // Act
      const { result } = renderWithRedux();

      // Assert
      expect(result.current.activeTab).toBeNull();
      expect(result.current.subscriptionId).toBeNull();
      expect(result.current.currentTierId).toBeNull();
      expect(result.current.balance).toEqual({
        total: null,
        refereePortion: null,
        updatedAt: null,
      });
      expect(result.current.referralDetails).toEqual({
        referralCode: null,
        refereeCount: 0,
      });
    });
  });

  describe('Active tab state', () => {
    it('returns overview tab when active', () => {
      // Arrange
      const mockState = { activeTab: 'overview' as RewardsTab };

      // Act
      const { result } = renderWithRedux(mockState);

      // Assert
      expect(result.current.activeTab).toBe('overview');
    });

    it('returns activity tab when active', () => {
      // Arrange
      const mockState = { activeTab: 'activity' as RewardsTab };

      // Act
      const { result } = renderWithRedux(mockState);

      // Assert
      expect(result.current.activeTab).toBe('activity');
    });

    it('returns null when no tab is active', () => {
      // Arrange
      const mockState = { activeTab: null as RewardsTab | null };

      // Act
      const { result } = renderWithRedux(mockState);

      // Assert
      expect(result.current.activeTab).toBeNull();
    });
  });

  describe('Subscription state', () => {
    it('returns subscription details when available', () => {
      // Arrange
      const mockState = {
        subscriptionId: 'sub-12345678',
        currentTierId: 'tier-gold',
      };

      // Act
      const { result } = renderWithRedux(mockState);

      // Assert
      expect(result.current.subscriptionId).toEqual('sub-12345678');
      expect(result.current.currentTierId).toEqual('tier-gold');
    });

    it('returns null values when subscription is not available', () => {
      // Arrange
      const mockState = {
        subscriptionId: null,
        currentTierId: null,
      };

      // Act
      const { result } = renderWithRedux(mockState);

      // Assert
      expect(result.current.subscriptionId).toBeNull();
      expect(result.current.currentTierId).toBeNull();
    });
  });

  describe('Balance state', () => {
    it('returns balance details when available', () => {
      // Arrange
      const mockDate = new Date('2024-03-15T10:30:00.000Z');
      const mockState = {
        balanceTotal: 1500,
        balanceRefereePortion: 300,
        balanceUpdatedAt: mockDate,
      };

      // Act
      const { result } = renderWithRedux(mockState);

      // Assert
      expect(result.current.balance).toEqual({
        total: 1500,
        refereePortion: 300,
        updatedAt: mockDate,
      });
    });

    it('returns null values when balance is not available', () => {
      // Arrange
      const mockState = {
        balanceTotal: null,
        balanceRefereePortion: null,
        balanceUpdatedAt: null,
      };

      // Act
      const { result } = renderWithRedux(mockState);

      // Assert
      expect(result.current.balance).toEqual({
        total: null,
        refereePortion: null,
        updatedAt: null,
      });
    });

    it('returns zero values when explicitly set', () => {
      // Arrange
      const mockState = {
        balanceTotal: 0,
        balanceRefereePortion: 0,
      };

      // Act
      const { result } = renderWithRedux(mockState);

      // Assert
      expect(result.current.balance.total).toBe(0);
      expect(result.current.balance.refereePortion).toBe(0);
    });
  });

  describe('Referral details state', () => {
    it('returns referral details when available', () => {
      // Arrange
      const mockState = {
        referralCode: 'METAMASK123',
        refereeCount: 5,
        balanceRefereePortion: 250,
      };

      // Act
      const { result } = renderWithRedux(mockState);

      // Assert
      expect(result.current.referralDetails).toEqual({
        referralCode: 'METAMASK123',
        refereeCount: 5,
      });
    });

    it('returns null/zero values when referral data is not available', () => {
      // Arrange
      const mockState = {
        referralCode: null,
        refereeCount: 0,
        balanceRefereePortion: null,
      };

      // Act
      const { result } = renderWithRedux(mockState);

      // Assert
      expect(result.current.referralDetails).toEqual({
        referralCode: null,
        refereeCount: 0,
      });
    });
  });

  describe('Complete state scenario', () => {
    it('returns all data when fully populated state is provided', () => {
      // Arrange
      const mockDate = new Date('2024-03-15T10:30:00.000Z');
      const mockState: RewardsState = {
        activeTab: 'overview',
        subscriptionId: 'sub-87654321',
        currentTierId: 'tier-platinum',
        balanceTotal: 2000,
        balanceRefereePortion: 800,
        balanceUpdatedAt: mockDate,
        referralCode: 'METAMASK999',
        refereeCount: 12,
        seasonStatusLoading: false,
      };

      // Act
      const { result } = renderWithRedux(mockState);

      // Assert
      expect(result.current).toEqual({
        activeTab: 'overview',
        subscriptionId: 'sub-87654321',
        currentTierId: 'tier-platinum',
        balance: {
          total: 2000,
          refereePortion: 800,
          updatedAt: mockDate,
        },
        referralDetails: {
          referralCode: 'METAMASK999',
          refereeCount: 12,
        },
        seasonStatusLoading: false,
      });
    });
  });

  describe('Hook stability', () => {
    it('returns stable object structure on re-renders with same data', () => {
      // Arrange
      const mockState = {
        referralCode: 'METAMASK123',
        balanceTotal: 1000,
      };

      // Act
      const { result, rerender } = renderWithRedux(mockState);
      const initialResult = result.current;

      rerender();
      const rerenderedResult = result.current;

      // Assert - structure should be the same but objects are new
      expect(rerenderedResult.activeTab).toBe(initialResult.activeTab);
      expect(rerenderedResult.subscriptionId).toEqual(
        initialResult.subscriptionId,
      );
      expect(rerenderedResult.currentTierId).toEqual(
        initialResult.currentTierId,
      );
      expect(rerenderedResult.balance).toEqual(initialResult.balance);
      expect(rerenderedResult.referralDetails).toEqual(
        initialResult.referralDetails,
      );
    });
  });
});
