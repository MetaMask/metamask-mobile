import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { useRewardsMoneyMe } from './useRewardsMoneyMe';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: { controllerMessenger: { call: jest.fn() } },
}));

// The flag is a build-time constant, so its "off" branch needs its own module
// registry — a single file cannot exercise both states.
jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  REWARDS_MONEY_ENABLED: false,
}));

describe('useRewardsMoneyMe with the feature flag off', () => {
  it('makes no network call', () => {
    renderHook(() => useRewardsMoneyMe());

    expect(Engine.controllerMessenger.call).not.toHaveBeenCalled();
  });

  it('settles immediately rather than showing a permanent spinner', () => {
    const { result } = renderHook(() => useRewardsMoneyMe());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.me).toBeNull();
  });
});
