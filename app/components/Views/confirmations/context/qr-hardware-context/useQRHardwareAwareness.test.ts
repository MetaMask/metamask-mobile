import { useQRHardwareAwareness } from './useQRHardwareAwareness';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';

const initialState = {
  pendingScanRequest: undefined,
  isSigningQRObject: false,
};

describe('useQRHardwareAwareness', () => {
  it('returns correct initial values', () => {
    const { result } = renderHookWithProvider(() => useQRHardwareAwareness(), {
      state: {
        qrKeyringScanner: {},
      },
    });
    expect(result.current).toMatchObject(initialState);
  });
});
