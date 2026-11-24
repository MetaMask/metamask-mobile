import { Platform } from 'react-native';
import { TransakEnvironment } from '@metamask/ramps-controller';
import {
  getTransakApiKey,
  getTransakEnvironment,
  transakServiceInit,
} from './transak-service-init';

let mockStoredApiKey: string | null = null;
const mockSetApiKey = jest.fn((apiKey: string) => {
  mockStoredApiKey = apiKey;
});
const mockTransakService = jest
  .fn()
  .mockImplementation((opts: { apiKey?: string }) => {
    mockStoredApiKey = opts.apiKey ?? null;
    return {
      ...opts,
      setApiKey: mockSetApiKey,
      getApiKey: () => mockStoredApiKey,
    };
  });

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

type StateChangeHandler = (state: {
  remoteFeatureFlags: Record<string, unknown>;
}) => void;

function createInitMessenger(remoteFeatureFlags: Record<string, unknown> = {}) {
  let onStateChange: StateChangeHandler | undefined;
  const initMessenger = {
    call: jest.fn(() => ({ remoteFeatureFlags })),
    subscribe: jest.fn((_event: string, handler: StateChangeHandler) => {
      onStateChange = handler;
    }),
  };
  return {
    initMessenger,
    emitFlags: (flags: Record<string, unknown>) =>
      onStateChange?.({ remoteFeatureFlags: flags }),
  };
}

function initialize(remoteFeatureFlags?: Record<string, unknown>) {
  const { initMessenger, emitFlags } = createInitMessenger(remoteFeatureFlags);
  const mockMessenger = {} as never;
  const result = transakServiceInit({
    controllerMessenger: mockMessenger,
    initMessenger,
  } as never);
  return { result, initMessenger, emitFlags, mockMessenger };
}

describe('transak-service-init', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransakApiKey', () => {
    it('returns the providerApiKey from depositConfig', () => {
      expect(
        getTransakApiKey({ depositConfig: { providerApiKey: 'key-1' } }),
      ).toBe('key-1');
    });

    it.each([
      ['no flags', undefined],
      ['no depositConfig', {}],
      ['a null key', { depositConfig: { providerApiKey: null } }],
      ['an empty key', { depositConfig: { providerApiKey: '' } }],
    ])('returns undefined for %s', (_label, flags) => {
      expect(getTransakApiKey(flags as never)).toBeUndefined();
    });
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

      const { result, mockMessenger } = initialize();

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

      const { result } = initialize();

      expect(mockTransakService).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'mobile-android',
          fetch: expect.any(Function),
        }),
      );
      expect(result).toEqual({ controller: expect.any(Object) });
    });

    it('passes the environment from getTransakEnvironment', () => {
      initialize();

      const calledWith = mockTransakService.mock.calls[0][0];
      expect(['PRODUCTION', 'STAGING', 'DEVELOPMENT']).toContain(
        calledWith.environment,
      );
    });

    it('passes the app bundle id as the Transak referrer domain', () => {
      initialize();

      expect(mockTransakService).toHaveBeenCalledWith(
        expect.objectContaining({
          referrerDomain: 'io.metamask',
        }),
      );
    });

    it('passes the API key from the current remote flags', () => {
      const { initMessenger } = initialize({
        depositConfig: { providerApiKey: 'startup-key' },
      });

      expect(initMessenger.call).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:getState',
      );
      expect(mockTransakService).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'startup-key' }),
      );
    });

    it('creates the service without an API key when the flag has none', () => {
      initialize();

      expect(mockTransakService.mock.calls[0][0].apiKey).toBeUndefined();
    });

    it('sets the API key when remote flags deliver one after startup', () => {
      const { initMessenger, emitFlags } = initialize();

      emitFlags({ depositConfig: { providerApiKey: 'fetched-key' } });

      expect(initMessenger.subscribe).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:stateChange',
        expect.any(Function),
      );
      expect(mockSetApiKey).toHaveBeenCalledTimes(1);
      expect(mockSetApiKey).toHaveBeenCalledWith('fetched-key');
    });

    it('sets the API key again only when it changes', () => {
      const { emitFlags } = initialize({
        depositConfig: { providerApiKey: 'startup-key' },
      });

      emitFlags({ depositConfig: { providerApiKey: 'startup-key' } });
      expect(mockSetApiKey).not.toHaveBeenCalled();

      emitFlags({ depositConfig: { providerApiKey: 'rotated-key' } });
      expect(mockSetApiKey).toHaveBeenCalledWith('rotated-key');
    });

    it('keeps the current API key when the flags drop it', () => {
      const { emitFlags } = initialize({
        depositConfig: { providerApiKey: 'startup-key' },
      });

      emitFlags({});

      expect(mockSetApiKey).not.toHaveBeenCalled();
    });

    it('sets the flag key again when the service key was changed elsewhere', () => {
      const { emitFlags } = initialize({
        depositConfig: { providerApiKey: 'startup-key' },
      });
      mockStoredApiKey = 'other-key';

      emitFlags({ depositConfig: { providerApiKey: 'startup-key' } });

      expect(mockSetApiKey).toHaveBeenCalledTimes(1);
      expect(mockSetApiKey).toHaveBeenCalledWith('startup-key');
    });
  });
});
