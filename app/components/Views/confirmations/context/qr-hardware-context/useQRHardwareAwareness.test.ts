import { renderHook } from '@testing-library/react-native';
import { useQRHardwareAwareness } from './useQRHardwareAwareness';

const initialState = {
  pendingScanRequest: null,
  isSigningQRObject: false,
};

describe('useQRHardwareAwareness', () => {
  it('returns correct initial values', () => {
    const { result } = renderHook(() => useQRHardwareAwareness());
    expect(result.current).toMatchObject(initialState);
  });
});
