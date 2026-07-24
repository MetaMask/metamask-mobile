import { Platform } from 'react-native';
import { TransakEnvironment } from '@metamask/ramps-controller';
import {
  getTransakEnvironment,
  transakServiceInit,
} from './transak-service-init';

const mockTransakService = jest.fn().mockImplementation((opts) => opts);

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
    const originalBuildsFlag =
      process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY;

    beforeEach(() => {
      delete process.env.RAMPS_ENVIRONMENT;
      delete process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY;
    });

    afterEach(() => {
      process.env.METAMASK_ENVIRONMENT = originalEnv;
      if (originalRampsEnvironment !== undefined) {
        process.env.RAMPS_ENVIRONMENT = originalRampsEnvironment;
      } else {
        delete process.env.RAMPS_ENVIRONMENT;
      }
      if (originalBuildsFlag !== undefined) {
        process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY =
          originalBuildsFlag;
      } else {
        delete process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY;
      }
    });

    describe('when BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY is true (builds.yml path)', () => {
      beforeEach(() => {
        process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY = 'true';
      });

      it('returns Production when RAMPS_ENVIRONMENT is production', () => {
        process.env.RAMPS_ENVIRONMENT = 'production';
        expect(getTransakEnvironment()).toBe(TransakEnvironment.Production);
      });

      it('returns Staging when RAMPS_ENVIRONMENT is not production', () => {
        process.env.RAMPS_ENVIRONMENT = 'staging';
        expect(getTransakEnvironment()).toBe(TransakEnvironment.Staging);
      });

      it('ignores METAMASK_ENVIRONMENT when RAMPS_ENVIRONMENT is set', () => {
        process.env.METAMASK_ENVIRONMENT = 'production';
        process.env.RAMPS_ENVIRONMENT = 'staging';
        expect(getTransakEnvironment()).toBe(TransakEnvironment.Staging);
      });

      it('falls back to METAMASK_ENVIRONMENT when RAMPS_ENVIRONMENT is unset', () => {
        process.env.METAMASK_ENVIRONMENT = 'production';
        delete process.env.RAMPS_ENVIRONMENT;
        expect(getTransakEnvironment()).toBe(TransakEnvironment.Production);
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

      it('ignores RAMPS_ENVIRONMENT when builds flag is not set', () => {
        process.env.METAMASK_ENVIRONMENT = 'production';
        process.env.RAMPS_ENVIRONMENT = 'staging';
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
