import { renderHook } from '@testing-library/react-native';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';
import { useABTest } from './useABTest';
import {
  PRO_SUBSCRIPTION_FLOW_AB_KEY,
  PRO_SUBSCRIPTION_FLOW_AB_TEST_EXPOSURE_OPTIONS,
  PRO_SUBSCRIPTION_FLOW_VARIANTS,
} from '../components/Views/ProSubscription/abTestConfig';

jest.mock('./useABTest');

const mockUseABTest = jest.mocked(useABTest);

describe('useProSubscriptionEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isProSubscriptionEnabled=false when variant is control', () => {
    mockUseABTest.mockReturnValue({
      variant: { isProSubscriptionEnabled: false },
      variantName: 'control',
      isActive: false,
    });

    const { result } = renderHook(() => useProSubscriptionEnabled());

    expect(result.current.isProSubscriptionEnabled).toBe(false);
    expect(result.current.variantName).toBe('control');
    expect(result.current.isActive).toBe(false);
  });

  it('returns isProSubscriptionEnabled=true when variant is treatment', () => {
    mockUseABTest.mockReturnValue({
      variant: { isProSubscriptionEnabled: true },
      variantName: 'treatment',
      isActive: true,
    });

    const { result } = renderHook(() => useProSubscriptionEnabled());

    expect(result.current.isProSubscriptionEnabled).toBe(true);
    expect(result.current.variantName).toBe('treatment');
    expect(result.current.isActive).toBe(true);
  });

  it('falls back to control (Pro flow hidden) when flag is missing', () => {
    mockUseABTest.mockReturnValue({
      variant: { isProSubscriptionEnabled: false },
      variantName: 'control',
      isActive: false,
    });

    const { result } = renderHook(() => useProSubscriptionEnabled());

    expect(result.current.isProSubscriptionEnabled).toBe(false);
    expect(result.current.isActive).toBe(false);
  });

  it('passes the correct flag key, variants, and exposure options to useABTest', () => {
    mockUseABTest.mockReturnValue({
      variant: { isProSubscriptionEnabled: false },
      variantName: 'control',
      isActive: false,
    });

    renderHook(() => useProSubscriptionEnabled());

    expect(mockUseABTest).toHaveBeenCalledWith(
      PRO_SUBSCRIPTION_FLOW_AB_KEY,
      PRO_SUBSCRIPTION_FLOW_VARIANTS,
      PRO_SUBSCRIPTION_FLOW_AB_TEST_EXPOSURE_OPTIONS,
    );
  });
});
