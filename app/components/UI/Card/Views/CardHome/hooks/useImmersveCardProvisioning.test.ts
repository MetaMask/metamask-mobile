import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useImmersveCardProvisioning } from './useImmersveCardProvisioning';
import Engine from '../../../../../../core/Engine';
import type { CardHomeData } from '../../../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    CardController: {
      fetchCardHomeData: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

const mockUseSelector = useSelector as jest.Mock;
const mockFetchCardHomeData = Engine.context.CardController
  .fetchCardHomeData as jest.Mock;

const provisioningData = {
  alerts: [{ type: 'card_provisioning', dismissable: false }],
} as CardHomeData;

describe('useImmersveCardProvisioning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('polls fetchCardHomeData while provisioning on Immersve', () => {
    mockUseSelector.mockReturnValue('immersve');

    const { result } = renderHook(() =>
      useImmersveCardProvisioning(provisioningData),
    );

    expect(result.current.isProvisioning).toBe(true);

    jest.advanceTimersByTime(10000);
    expect(mockFetchCardHomeData).toHaveBeenCalledTimes(2);
  });

  it('does not poll for non-Immersve providers', () => {
    mockUseSelector.mockReturnValue('baanx');

    const { result } = renderHook(() =>
      useImmersveCardProvisioning(provisioningData),
    );

    expect(result.current.isProvisioning).toBe(false);
    jest.advanceTimersByTime(10000);
    expect(mockFetchCardHomeData).not.toHaveBeenCalled();
  });

  it('does not poll when there is no provisioning alert', () => {
    mockUseSelector.mockReturnValue('immersve');

    renderHook(() => useImmersveCardProvisioning({ alerts: [] } as never));

    jest.advanceTimersByTime(10000);
    expect(mockFetchCardHomeData).not.toHaveBeenCalled();
  });

  it('stops polling on unmount', () => {
    mockUseSelector.mockReturnValue('immersve');

    const { unmount } = renderHook(() =>
      useImmersveCardProvisioning(provisioningData),
    );

    jest.advanceTimersByTime(5000);
    expect(mockFetchCardHomeData).toHaveBeenCalledTimes(1);

    unmount();
    jest.advanceTimersByTime(15000);
    expect(mockFetchCardHomeData).toHaveBeenCalledTimes(1);
  });
});
