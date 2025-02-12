import { renderHook } from '@testing-library/react-native';
import { useQRHardwareAwareness } from './useQRHardwareAwareness';
import Engine from '../../../../../core/Engine';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      getOrAddQRKeyring: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const initialState = {
  QRState: {
    sync: {
      reading: false,
    },
    sign: {},
  },
  isQRSigningInProgress: false,
  isSigningQRObject: false,
};

describe('useQRHardwareAwareness', () => {
  it('invokes required methods from Engine', () => {
    renderHook(() => useQRHardwareAwareness());
    expect(
      Engine.context.KeyringController.getOrAddQRKeyring,
    ).toHaveBeenCalledTimes(1);
    expect(Engine.controllerMessenger.subscribe).toHaveBeenCalledTimes(1);
  });
  it('returns correct initial values', () => {
    const { result } = renderHook(() => useQRHardwareAwareness());
    expect(result.current).toMatchObject(initialState);
  });
});
