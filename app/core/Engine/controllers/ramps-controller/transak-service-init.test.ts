import { Platform } from 'react-native';
import { TransakEnvironment } from '@metamask/ramps-controller';
import {
  getTransakEnvironment,
  transakServiceInit,
} from './transak-service-init';

const mockTransakService = jest.fn().mockImplementation((opts) => opts);

// Keep the real `RampsEnvironment`/`TransakEnvironment` enums (so environment
// resolution mirrors production, since `getTransakEnvironment` now delegates to
// the real `getRampsEnvironment`) and only stub the service class.
jest.mock('@metamask/ramps-controller', () => {
  const actual = jest.requireActual('@metamask/ramps-controller');
  return {
    ...actual,
    TransakService: (...args: unknown[]) => mockTransakService(...args),
  };
});

describe('transak-service-init', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransakEnvironment', () => {
    const originalEnv = process.env.METAMASK_ENVIRONMENT;
    const originalRampsEnvironment = process.env.RAMPS_ENVIRONMENT;

    beforeEach(() => {
      delete process.env.RAMPS_ENVIRONMENT;
    });

    afterEach(() => {
      process.env.METAMASK_ENVIRONMENT = originalEnv;
      if (originalRampsEnvironment !== undefined) {
        process.env.RAMPS_ENVIRONMENT = originalRampsEnvironment;
      } else {
        delete process.env.RAMPS_ENVIRONMENT;
      }
    });

    describe('when RAMPS_ENVIRONMENT is set (builds.yml path)', () => {
      it('returns Production when RAMPS_ENVIRONMENT is production', () => {
        process.env.RAMPS_ENVIRONMENT = 'production';
        expect(getTransakEnvironment()).toBe(TransakEnvironment.Production);
      });

      it('returns Staging when RAMPS_ENVIRONMENT is not production', () => {
        process.env.RAMPS_ENVIRONMENT = 'staging';
        expect(getTransakEnvironment()).toBe(TransakEnvironment.Staging);
      });

      it('ignores METAMASK_ENVIRONMENT (uses RAMPS_ENVIRONMENT)', () => {
        process.env.METAMASK_ENVIRONMENT = 'production';
        process.env.RAMPS_ENVIRONMENT = 'staging';
        expect(getTransakEnvironment()).toBe(TransakEnvironment.Staging);
      });
    });

    describe('legacy METAMASK_ENVIRONMENT path', () => {
      it.each(['production', 'beta', 'rc'])(
        'returns Production for %s environment',
        (env) => {
          process.env.METAMASK_ENVIRONMENT = env;
          expect(getTransakEnvironment()).toBe(TransakEnvironment.Production);
        },
      );

      it.each(['dev', 'exp', 'test', 'e2e', 'unknown'])(
        'returns Staging for %s environment',
        (env) => {
          process.env.METAMASK_ENVIRONMENT = env;
          expect(getTransakEnvironment()).toBe(TransakEnvironment.Staging);
        },
      );

      it('returns Staging for undefined environment', () => {
        delete process.env.METAMASK_ENVIRONMENT;
        expect(getTransakEnvironment()).toBe(TransakEnvironment.Staging);
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
      expect([
        TransakEnvironment.Production,
        TransakEnvironment.Staging,
      ]).toContain(calledWith.environment);
    });
  });
});
