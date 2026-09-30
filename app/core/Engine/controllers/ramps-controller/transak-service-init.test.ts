import { Platform } from 'react-native';
import { TransakEnvironment } from '@metamask/ramps-controller';
import {
  getTransakEnvironment,
  transakServiceInit,
} from './transak-service-init';

const mockTransakService = jest.fn().mockImplementation((opts) => opts);

jest.mock('@metamask/ramps-controller', () => ({
  // Declared as a function (not an arrow) so `new TransakService()` works, and
  // it forwards to `mockTransakService` rather than referencing it directly
  // because the factory runs before that `const` is initialised.
  TransakService: function TransakService(...args: unknown[]) {
    return mockTransakService(...args);
  },
  TransakServiceMessenger: jest.fn(),
  TransakEnvironment: {
    Production: 'PRODUCTION',
    Staging: 'STAGING',
    Development: 'DEVELOPMENT',
  },
}));

jest.mock('react-native-device-info', () => ({
  getBundleId: jest.fn().mockReturnValue('io.metamask'),
}));

jest.mock('./ramps-service-init', () => ({
  getRampsClientIdentity: () => ({
    clientProduct: 'metamask-mobile',
    clientVersion: '8.9.0',
  }),
}));

describe('transak-service-init', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransakEnvironment', () => {
    const originalApiEnv = process.env.MM_API_ENV;

    afterEach(() => {
      if (originalApiEnv !== undefined) {
        process.env.MM_API_ENV = originalApiEnv;
      } else {
        delete process.env.MM_API_ENV;
      }
    });

    it.each([
      ['dev', TransakEnvironment.Development],
      ['uat', TransakEnvironment.Staging],
      ['prod', TransakEnvironment.Production],
    ] as const)('maps MM_API_ENV=%s to %s', (apiEnv, expected) => {
      process.env.MM_API_ENV = apiEnv;

      expect(getTransakEnvironment()).toBe(expected);
    });

    it('returns Production when MM_API_ENV is unset', () => {
      delete process.env.MM_API_ENV;

      expect(getTransakEnvironment()).toBe(TransakEnvironment.Production);
    });
  });

  describe('transakServiceInit', () => {
    it('creates a TransakService with ios context', () => {
      Platform.OS = 'ios';

      const mockMessenger = {} as never;
      const result = transakServiceInit({
        controllerMessenger: mockMessenger,
      } as never);

      expect(mockTransakService).toHaveBeenCalledWith(
        expect.objectContaining({
          messenger: mockMessenger,
          context: 'mobile-ios',
          fetch: expect.any(Function),
          clientProduct: 'metamask-mobile',
          clientVersion: '8.9.0',
        }),
      );
      expect(result).toEqual({ controller: expect.any(Object) });
    });

    it('creates a TransakService with android context', () => {
      Platform.OS = 'android';

      const mockMessenger = {} as never;
      const result = transakServiceInit({
        controllerMessenger: mockMessenger,
      } as never);

      expect(mockTransakService).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'mobile-android',
          fetch: expect.any(Function),
        }),
      );
      expect(result).toEqual({ controller: expect.any(Object) });
    });

    it('passes the environment from getTransakEnvironment', () => {
      const mockMessenger = {} as never;
      transakServiceInit({
        controllerMessenger: mockMessenger,
      } as never);

      const calledWith = mockTransakService.mock.calls[0][0];
      expect(['PRODUCTION', 'STAGING', 'DEVELOPMENT']).toContain(
        calledWith.environment,
      );
    });

    it('passes the app bundle id as the Transak referrer domain', () => {
      const mockMessenger = {} as never;
      transakServiceInit({
        controllerMessenger: mockMessenger,
      } as never);

      expect(mockTransakService).toHaveBeenCalledWith(
        expect.objectContaining({
          referrerDomain: 'io.metamask',
        }),
      );
    });
  });
});
