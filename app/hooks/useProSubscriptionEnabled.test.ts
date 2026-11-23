import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';
import { selectProSubscriptionEnabled } from '../selectors/featureFlagController/moneyAccount';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);

describe('useProSubscriptionEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isProSubscriptionEnabled=true when the flag selector is on', () => {
    mockUseSelector.mockReturnValue(true);

    const { result } = renderHook(() => useProSubscriptionEnabled());

    expect(mockUseSelector).toHaveBeenCalledWith(selectProSubscriptionEnabled);
    expect(result.current.isProSubscriptionEnabled).toBe(true);
  });

  it('returns isProSubscriptionEnabled=false when the flag selector is off', () => {
    mockUseSelector.mockReturnValue(false);

    const { result } = renderHook(() => useProSubscriptionEnabled());

    expect(result.current.isProSubscriptionEnabled).toBe(false);
  });
});
