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
    const originalEnv = process.env.METAMASK_ENVIRONMENT;
    const originalApiEnv = process.env.API_ENV;

    beforeEach(() => {
      delete process.env.API_ENV;
    });

    afterEach(() => {
      process.env.METAMASK_ENVIRONMENT = originalEnv;
      if (originalApiEnv !== undefined) {
        process.env.API_ENV = originalApiEnv;
      } else {
        delete process.env.API_ENV;
      }
    });

    describe('when API_ENV is set', () => {
      it('returns Development when API_ENV is dev', () => {
        process.env.METAMASK_ENVIRONMENT = 'production';
        process.env.API_ENV = 'dev';
        expect(getTransakEnvironment()).toBe(TransakEnvironment.Development);
      });

      it('returns Staging when API_ENV is uat', () => {
        process.env.METAMASK_ENVIRONMENT = 'production';
        process.env.API_ENV = 'uat';
        expect(getTransakEnvironment()).toBe(TransakEnvironment.Staging);
      });
    });

    describe('METAMASK_ENVIRONMENT path', () => {
      it.each(['production', 'beta', 'rc', 'test', 'e2e', 'unknown'])(
        'returns Production for %s environment',
        (env) => {
          process.env.METAMASK_ENVIRONMENT = env;
          expect(getTransakEnvironment()).toBe(TransakEnvironment.Production);
        },
      );

      it('returns Development for dev environment', () => {
        process.env.METAMASK_ENVIRONMENT = 'dev';
        expect(getTransakEnvironment()).toBe(TransakEnvironment.Development);
      });

      it('returns Staging for exp environment', () => {
        process.env.METAMASK_ENVIRONMENT = 'exp';
        expect(getTransakEnvironment()).toBe(TransakEnvironment.Staging);
      });

      it('returns Production for undefined environment', () => {
        delete process.env.METAMASK_ENVIRONMENT;
        expect(getTransakEnvironment()).toBe(TransakEnvironment.Production);
      });
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
