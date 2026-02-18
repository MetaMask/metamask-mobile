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
    it('returns a valid TransakEnvironment value', () => {
      const result = getTransakEnvironment();
      expect(['PRODUCTION', 'STAGING']).toContain(result);
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
