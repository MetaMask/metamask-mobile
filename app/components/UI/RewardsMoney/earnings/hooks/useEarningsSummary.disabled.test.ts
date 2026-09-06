import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { useEarningsSummary } from './useEarningsSummary';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: { controllerMessenger: { call: jest.fn() } },
}));

jest.mock('../../hooks/useRewardsMoneyEvents', () => ({
  __esModule: true,
  default: jest.fn(),
  useRewardsMoneyEvents: jest.fn(),
}));

// The flag is a build-time constant, so its "off" branch needs its own module
// registry — a single file cannot exercise both states.
jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  REWARDS_MONEY_ENABLED: false,
}));

describe('useEarningsSummary with the feature flag off', () => {
  it('makes no network call', () => {
    renderHook(() => useEarningsSummary(['CASHBACK']));

    expect(Engine.controllerMessenger.call).not.toHaveBeenCalled();
  });

  it('settles immediately rather than showing a permanent skeleton', () => {
    const { result } = renderHook(() => useEarningsSummary(['CASHBACK']));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.summary).toBeNull();
  });
});
