import Braze from '@braze/react-native-sdk';
import Logger from '../../util/Logger';
import { registerBrazePushToken } from './registerPush';

jest.mock('../../util/test/utils', () => ({
  hasTestOverrides: false,
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

describe('registerBrazePushToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the token with Braze', () => {
    registerBrazePushToken('fcm-token-123');

    expect(Braze.registerPushToken).toHaveBeenCalledWith('fcm-token-123');
    expect(Logger.log).toHaveBeenCalledWith(
      '[Braze] Registered this device for Braze push',
    );
  });

  it('does not call Braze when the token is empty', () => {
    registerBrazePushToken('');

    expect(Braze.registerPushToken).not.toHaveBeenCalled();
  });

  it('logs when Braze.registerPushToken throws', () => {
    jest.mocked(Braze.registerPushToken).mockImplementation(() => {
      throw new Error('native register failed');
    });

    registerBrazePushToken('fcm-token-123');

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      '[Braze] Failed to register push token',
    );
  });
});
