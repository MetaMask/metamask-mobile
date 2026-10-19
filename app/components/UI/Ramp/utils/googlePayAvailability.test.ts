import { NativeModules } from 'react-native';

import {
  GOOGLE_PAY_AVAILABILITY_TIMEOUT_MS,
  checkGooglePayAvailability,
  needsGooglePayPreflight,
} from './googlePayAvailability';

jest.mock('../../../../util/device', () => ({
  __esModule: true,
  default: {
    isAndroid: jest.fn(() => true),
    isIos: jest.fn(() => false),
  },
}));

const mockDevice = jest.requireMock('../../../../util/device').default as {
  isAndroid: jest.Mock;
  isIos: jest.Mock;
};

type CanMakePayments = (
  paymentMethodData: { environment: string },
  onError: (error: unknown) => void,
  onResult: (canMakePayments: boolean) => void,
) => void;

const mockCanMakePayments = jest.fn<void, Parameters<CanMakePayments>>();

describe('googlePayAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDevice.isAndroid.mockReturnValue(true);
    NativeModules.ReactNativePayments = {
      canMakePayments: mockCanMakePayments,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete NativeModules.ReactNativePayments;
  });

  describe('needsGooglePayPreflight', () => {
    it.each([
      ['/providers/coinbase-m', '/payments/google-pay', true],
      ['coinbase', 'google-pay', true],
      ['/providers/coinbase-m', '/payments/apple-pay', false],
      ['/providers/coinbase-m', '/payments/debit-credit-card', false],
      ['/providers/crossmint', '/payments/google-pay', false],
      [undefined, '/payments/google-pay', false],
      ['/providers/coinbase-m', undefined, false],
    ])(
      'provider %s with payment %s on Android -> %s',
      (providerId, paymentMethodId, expected) => {
        expect(needsGooglePayPreflight(providerId, paymentMethodId)).toBe(
          expected,
        );
      },
    );

    it('never applies off Android', () => {
      mockDevice.isAndroid.mockReturnValue(false);

      expect(
        needsGooglePayPreflight(
          '/providers/coinbase-m',
          '/payments/google-pay',
        ),
      ).toBe(false);
    });
  });

  describe('checkGooglePayAvailability', () => {
    it('reports unavailable only on an explicit false from Play Services', async () => {
      mockCanMakePayments.mockImplementation((_data, _onError, onResult) =>
        onResult(false),
      );

      await expect(checkGooglePayAvailability()).resolves.toBe('unavailable');
      expect(mockCanMakePayments).toHaveBeenCalledWith(
        { environment: 'PRODUCTION' },
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('reports available on true', async () => {
      mockCanMakePayments.mockImplementation((_data, _onError, onResult) =>
        onResult(true),
      );

      await expect(checkGooglePayAvailability()).resolves.toBe('available');
    });

    it('reports unknown when the bridge errors', async () => {
      mockCanMakePayments.mockImplementation((_data, onError) =>
        onError(new Error('no play services')),
      );

      await expect(checkGooglePayAvailability()).resolves.toBe('unknown');
    });

    it('reports unknown when the bridge throws synchronously', async () => {
      mockCanMakePayments.mockImplementation(() => {
        throw new Error('activity is null');
      });

      await expect(checkGooglePayAvailability()).resolves.toBe('unknown');
    });

    it('reports unknown when the native module is not linked', async () => {
      delete NativeModules.ReactNativePayments;

      await expect(checkGooglePayAvailability()).resolves.toBe('unknown');
    });

    it('reports unknown when Play Services never calls back', async () => {
      jest.useFakeTimers();
      mockCanMakePayments.mockImplementation(() => undefined);

      const pending = checkGooglePayAvailability();
      jest.advanceTimersByTime(GOOGLE_PAY_AVAILABILITY_TIMEOUT_MS);

      await expect(pending).resolves.toBe('unknown');
    });

    it('ignores a late callback after the timeout already resolved', async () => {
      jest.useFakeTimers();
      let lateResult: ((canMakePayments: boolean) => void) | undefined;
      mockCanMakePayments.mockImplementation((_data, _onError, onResult) => {
        lateResult = onResult;
      });

      const pending = checkGooglePayAvailability();
      jest.advanceTimersByTime(GOOGLE_PAY_AVAILABILITY_TIMEOUT_MS);
      await expect(pending).resolves.toBe('unknown');

      expect(() => lateResult?.(false)).not.toThrow();
    });
  });
});
