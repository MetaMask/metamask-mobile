import { renderHook } from '@testing-library/react-hooks';
import { useActivePointsBoosts } from './useActivePointsBoosts';
import Engine from '../../../../core/Engine';
import {
  setActiveBoosts,
  setActiveBoostsLoading,
  setActiveBoostsError,
} from '../../../../reducers/rewards';
import { useDispatch, useSelector } from 'react-redux';

import Logger from '../../../../util/Logger';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../reducers/rewards', () => ({
  setActiveBoosts: jest.fn(),
  setActiveBoostsLoading: jest.fn(),
  setActiveBoostsError: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectSeasonId: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

describe('useActivePointsBoosts', () => {
  const mockDispatch = jest.fn();
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockLogger = Logger.log as jest.MockedFunction<typeof Logger.log>;

  const mockActiveBoosts = [
    {
      id: 'boost-1',
      name: 'Test Boost 1',
      icon: {
        lightModeUrl: 'light.png',
        darkModeUrl: 'dark.png',
      },
      boostBips: 1000,
      seasonLong: true,
      backgroundColor: '#FF0000',
    },
    {
      id: 'boost-2',
      name: 'Test Boost 2',
      icon: {
        lightModeUrl: 'light2.png',
        darkModeUrl: 'dark2.png',
      },
      boostBips: 500,
      seasonLong: false,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      backgroundColor: '#00FF00',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    // Mock useSelector calls in order: first call is subscriptionId, second is seasonId
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return 'test-subscription-id'; // selectRewardsSubscriptionId
      }
      if (callCount === 2) {
        return 'test-season-id'; // selectSeasonId
      }
      return null;
    });
  });

  it('should return void', () => {
    const { result } = renderHook(() => useActivePointsBoosts());
    expect(result.current).toBeUndefined();
  });

  it('should skip fetch when seasonId is missing', () => {
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return 'test-subscription-id'; // selectRewardsSubscriptionId
      }
      if (callCount === 2) {
        return null; // selectSeasonId - missing
      }
      return null;
    });

    renderHook(() => useActivePointsBoosts());

    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(false));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsError(false));
    expect(mockLogger).toHaveBeenCalledWith(
      'useActivePointsBoosts: Missing seasonId or subscriptionId',
      {
        seasonId: null,
        subscriptionId: 'test-subscription-id',
      },
    );
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('should skip fetch when subscriptionId is missing', () => {
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return null; // selectRewardsSubscriptionId - missing
      }
      if (callCount === 2) {
        return 'test-season-id'; // selectSeasonId
      }
      return null;
    });

    renderHook(() => useActivePointsBoosts());

    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(false));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsError(false));
    expect(mockLogger).toHaveBeenCalledWith(
      'useActivePointsBoosts: Missing seasonId or subscriptionId',
      {
        seasonId: 'test-season-id',
        subscriptionId: null,
      },
    );
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('should fetch active points boosts successfully', async () => {
    mockEngineCall.mockResolvedValue(mockActiveBoosts);

    renderHook(() => useActivePointsBoosts());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(true));
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getActivePointsBoosts',
      'test-season-id',
      'test-subscription-id',
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setActiveBoosts(mockActiveBoosts),
    );
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsError(false));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(false));
    // The hook doesn't log success messages, only errors and missing parameters
  });

  it('should handle fetch error gracefully', async () => {
    const mockError = new Error('Network error');
    mockEngineCall.mockRejectedValue(mockError);

    renderHook(() => useActivePointsBoosts());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(true));
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getActivePointsBoosts',
      'test-season-id',
      'test-subscription-id',
    );
    expect(mockLogger).toHaveBeenCalledWith(
      'useActivePointsBoosts: Failed to fetch active points boosts:',
      'Network error',
    );
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsError(true));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(false));
    // Verify setActiveBoosts was not called in error case to prevent UI flash
    const setActiveBoostsCalls = mockDispatch.mock.calls.filter(
      (call) =>
        call[0] &&
        typeof call[0] === 'object' &&
        call[0].type?.includes('setActiveBoosts'),
    );
    expect(setActiveBoostsCalls).toHaveLength(0);
  });

  it('should handle empty boosts array', async () => {
    mockEngineCall.mockResolvedValue([]);

    renderHook(() => useActivePointsBoosts());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(true));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoosts([]));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsError(false));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(false));
    // The hook doesn't log success messages, only errors and missing parameters
  });

  it('should handle null response from controller', async () => {
    mockEngineCall.mockResolvedValue(null);

    renderHook(() => useActivePointsBoosts());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(true));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoosts([]));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsError(false));
    expect(mockDispatch).toHaveBeenCalledWith(setActiveBoostsLoading(false));
    // The hook doesn't log success messages, only errors and missing parameters
  });
});
