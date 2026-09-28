import { Platform } from 'react-native';
import { neoBankServiceInit } from './neo-bank-service-init';

const mockNeoBankService = jest.fn().mockImplementation((opts) => opts);

jest.mock('@metamask/ramps-controller', () => ({
  // The production initializer constructs this export with `new`, so the mock
  // must be constructible too. Hermes-stable preserves arrow functions instead
  // of down-leveling them into constructible function expressions.
  NeoBankService: function NeoBankService(...args: unknown[]) {
    return mockNeoBankService(...args);
  },
  NeoBankServiceMessenger: jest.fn(),
  RampsEnvironment: {
    Production: 'PRODUCTION',
    Staging: 'STAGING',
    Development: 'DEVELOPMENT',
  },
}));

describe('neoBankServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a NeoBankService with the service messenger and global fetch', () => {
    const mockMessenger = {} as never;

    const result = neoBankServiceInit({
      controllerMessenger: mockMessenger,
    } as never);

    expect(mockNeoBankService).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: mockMessenger,
        fetch: expect.any(Function),
      }),
    );
    expect(result).toEqual({ controller: expect.any(Object) });
  });

  it('shares the ramps environment resolution', () => {
    neoBankServiceInit({ controllerMessenger: {} as never } as never);

    expect(['PRODUCTION', 'STAGING', 'DEVELOPMENT']).toContain(
      mockNeoBankService.mock.calls[0][0].environment,
    );
  });

  it('creates a NeoBankService with ios context', () => {
    Platform.OS = 'ios';

    neoBankServiceInit({ controllerMessenger: {} as never } as never);

    expect(mockNeoBankService).toHaveBeenCalledWith(
      expect.objectContaining({ context: 'mobile-ios' }),
    );
  });

  it('creates a NeoBankService with android context', () => {
    Platform.OS = 'android';

    neoBankServiceInit({ controllerMessenger: {} as never } as never);

    expect(mockNeoBankService).toHaveBeenCalledWith(
      expect.objectContaining({ context: 'mobile-android' }),
    );
  });
});
