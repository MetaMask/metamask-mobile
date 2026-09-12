import { Alert } from 'react-native';
import { registerDevMenuItems } from 'expo-dev-menu';

import { registerAuthDebugMenuItems } from '.';
import Engine from '../Engine';
import ClipboardManager from '../ClipboardManager';
import Logger from '../../util/Logger';

jest.mock('expo-dev-menu', () => ({
  registerDevMenuItems: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../Engine', () => ({
  context: {
    AuthenticationController: {
      isSignedIn: jest.fn(),
      getSessionProfile: jest.fn(),
      getBearerToken: jest.fn(),
    },
  },
}));

jest.mock('../ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockRegisterDevMenuItems = jest.mocked(registerDevMenuItems);
const mockAuthController = jest.mocked(Engine).context.AuthenticationController;
const mockClipboard = jest.mocked(ClipboardManager);
const mockLogger = jest.mocked(Logger);

/**
 * Retrieves the callback for a registered dev-menu item by its label.
 */
const getCallback = (name: string): (() => void) => {
  const items = mockRegisterDevMenuItems.mock.calls[0][0];
  const item = items.find((entry) => entry.name === name);
  if (!item) {
    throw new Error(`Dev menu item "${name}" was not registered`);
  }
  return item.callback;
};

// Flush the microtask queue so the async callback bodies settle.
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('registerAuthDebugMenuItems', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('registers a collapsing entry for the profile ID and the JWT', () => {
    registerAuthDebugMenuItems();

    const items = mockRegisterDevMenuItems.mock.calls[0][0];
    expect(items).toEqual([
      expect.objectContaining({
        name: 'app_settings.auth_debugging.copy_profile_id',
        shouldCollapse: true,
      }),
      expect.objectContaining({
        name: 'app_settings.auth_debugging.copy_jwt',
        shouldCollapse: true,
      }),
    ]);
  });

  it('logs when registration fails', async () => {
    const error = new Error('boom');
    mockRegisterDevMenuItems.mockRejectedValueOnce(error);

    registerAuthDebugMenuItems();
    await flushPromises();

    expect(mockLogger.error).toHaveBeenCalledWith(
      error,
      'DevMenu: failed to register auth debug menu items',
    );
  });

  describe('copy profile ID callback', () => {
    it('copies the profile ID and confirms when signed in', async () => {
      mockAuthController.isSignedIn.mockReturnValue(true);
      mockAuthController.getSessionProfile.mockResolvedValue({
        profileId: 'profile-123',
      } as never);

      registerAuthDebugMenuItems();
      getCallback('app_settings.auth_debugging.copy_profile_id')();
      await flushPromises();

      expect(mockClipboard.setString).toHaveBeenCalledWith('profile-123');
      expect(alertSpy).toHaveBeenCalledWith(
        'app_settings.auth_debugging.title',
        'app_settings.auth_debugging.copied_profile_id',
      );
    });

    it('alerts and skips copying when not signed in', async () => {
      mockAuthController.isSignedIn.mockReturnValue(false);

      registerAuthDebugMenuItems();
      getCallback('app_settings.auth_debugging.copy_profile_id')();
      await flushPromises();

      expect(mockClipboard.setString).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'app_settings.auth_debugging.title',
        'app_settings.auth_debugging.not_signed_in',
      );
    });

    it('alerts when the profile ID is unavailable', async () => {
      mockAuthController.isSignedIn.mockReturnValue(true);
      mockAuthController.getSessionProfile.mockResolvedValue({} as never);

      registerAuthDebugMenuItems();
      getCallback('app_settings.auth_debugging.copy_profile_id')();
      await flushPromises();

      expect(mockClipboard.setString).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'app_settings.auth_debugging.title',
        'app_settings.auth_debugging.not_available',
      );
    });

    it('logs and alerts when reading the session throws', async () => {
      const error = new Error('read failed');
      mockAuthController.isSignedIn.mockReturnValue(true);
      mockAuthController.getSessionProfile.mockRejectedValue(error);

      registerAuthDebugMenuItems();
      getCallback('app_settings.auth_debugging.copy_profile_id')();
      await flushPromises();

      expect(mockLogger.error).toHaveBeenCalledWith(
        error,
        'DevMenu: failed to copy auth debug value',
      );
      expect(alertSpy).toHaveBeenCalledWith(
        'app_settings.auth_debugging.title',
        'app_settings.auth_debugging.copy_failed',
      );
    });
  });

  describe('copy JWT callback', () => {
    it('copies the bearer token and confirms when signed in', async () => {
      mockAuthController.isSignedIn.mockReturnValue(true);
      mockAuthController.getBearerToken.mockResolvedValue('jwt-token' as never);

      registerAuthDebugMenuItems();
      getCallback('app_settings.auth_debugging.copy_jwt')();
      await flushPromises();

      expect(mockClipboard.setString).toHaveBeenCalledWith('jwt-token');
      expect(alertSpy).toHaveBeenCalledWith(
        'app_settings.auth_debugging.title',
        'app_settings.auth_debugging.copied_jwt',
      );
    });
  });
});
