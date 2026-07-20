import { Platform } from 'react-native';
import {
  getTransakEnvironment,
  transakServiceInit,
} from './transak-service-init';

const mockTransakService = jest.fn().mockImplementation((opts) => opts);

jest.mock('@metamask/ramps-controller', () => ({
  TransakService: (...args: unknown[]) => mockTransakService(...args),
  TransakServiceMessenger: jest.fn(),
  TransakEnvironment: {
    Production: 'PRODUCTION',
    Staging: 'STAGING',
  },
}));

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
        expect(getTransakEnvironment()).toBe('PRODUCTION');
      });

      it('returns Staging when RAMPS_ENVIRONMENT is not production', () => {
        process.env.RAMPS_ENVIRONMENT = 'staging';
        expect(getTransakEnvironment()).toBe('STAGING');
      });

      it('ignores METAMASK_ENVIRONMENT (uses RAMPS_ENVIRONMENT)', () => {
        process.env.METAMASK_ENVIRONMENT = 'production';
        process.env.RAMPS_ENVIRONMENT = 'staging';
        expect(getTransakEnvironment()).toBe('STAGING');
      });
    });

    describe('legacy METAMASK_ENVIRONMENT path', () => {
      it.each(['production', 'beta', 'rc'])(
        'returns Production for %s environment',
        (env) => {
          process.env.METAMASK_ENVIRONMENT = env;
          expect(getTransakEnvironment()).toBe('PRODUCTION');
        },
      );

      it.each(['dev', 'exp', 'test', 'e2e', 'unknown'])(
        'returns Staging for %s environment',
        (env) => {
          process.env.METAMASK_ENVIRONMENT = env;
          expect(getTransakEnvironment()).toBe('STAGING');
        },
      );

      it('returns Staging for undefined environment', () => {
        delete process.env.METAMASK_ENVIRONMENT;
        expect(getTransakEnvironment()).toBe('STAGING');
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
      expect(['PRODUCTION', 'STAGING']).toContain(calledWith.environment);
    });
  });
});
