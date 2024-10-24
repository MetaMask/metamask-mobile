// Import necessary libraries and modules
import { signIn, signOut, enableNotificationServices, disableNotificationServices } from '.';
import Engine from '../../../core/Engine';

jest.mock('../../../core/Engine', () => ({
  resetState: jest.fn(),
  context: {
    AuthenticationController: {
      performSignIn: jest.fn(),
      performSignOut: jest.fn(),
      getSessionProfile: jest.fn(),
    },
    NotificationServicesController: {
      enableMetamaskNotifications:jest.fn(),
      disableNotificationServices:jest.fn(),
      checkAccountsPresence: jest.fn(),
    }
  },
}));

describe('Notification Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs in successfully and obtain profile', async () => {
    (Engine.context.AuthenticationController.performSignIn as jest.Mock).mockResolvedValue('valid-access-token');
    (Engine.context.AuthenticationController.getSessionProfile as jest.Mock).mockResolvedValue('valid-profile');

    const result = await signIn();

    expect(Engine.context.AuthenticationController.performSignIn).toHaveBeenCalled();
    expect(Engine.context.AuthenticationController.getSessionProfile).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('signs out successfully', async () => {
    (Engine.context.AuthenticationController.performSignOut as jest.Mock).mockResolvedValue(undefined);

    const result = await signOut();

    expect(Engine.context.AuthenticationController.performSignOut).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('enables notification services successfully', async () => {
    (Engine.context.NotificationServicesController.enableMetamaskNotifications as jest.Mock).mockResolvedValue(undefined);

    const result = await enableNotificationServices();

    expect(Engine.context.NotificationServicesController.enableMetamaskNotifications).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('disables notification services successfully', async () => {
    (Engine.context.NotificationServicesController.disableNotificationServices as jest.Mock).mockResolvedValue(undefined);

    const result = await disableNotificationServices();

    expect(Engine.context.NotificationServicesController.disableNotificationServices).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
