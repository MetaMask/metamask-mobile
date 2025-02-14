// Import necessary libraries and modules
import { enableNotificationServices, disableNotificationServices } from '.';
import Engine from '../../../core/Engine';

jest.mock('../../../core/Engine', () => ({
  resetState: jest.fn(),
  context: {
    NotificationServicesController: {
      enableMetamaskNotifications: jest.fn(),
      disableNotificationServices: jest.fn(),
      checkAccountsPresence: jest.fn(),
    },
  },
}));

describe('Notification Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enables notification services successfully', async () => {
    (
      Engine.context.NotificationServicesController
        .enableMetamaskNotifications as jest.Mock
    ).mockResolvedValue(undefined);

    const result = await enableNotificationServices();

    expect(
      Engine.context.NotificationServicesController.enableMetamaskNotifications,
    ).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('disables notification services successfully', async () => {
    (
      Engine.context.NotificationServicesController
        .disableNotificationServices as jest.Mock
    ).mockResolvedValue(undefined);

    const result = await disableNotificationServices();

    expect(
      Engine.context.NotificationServicesController.disableNotificationServices,
    ).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
