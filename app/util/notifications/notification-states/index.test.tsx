import { NotificationServicesController } from '@metamask/notification-services-controller';
import { hasNotificationModal, NotificationComponentState } from '.';

const { TRIGGER_TYPES } = NotificationServicesController.Constants;
type TRIGGER_TYPES = NotificationServicesController.Constants.TRIGGER_TYPES;
describe('hasNotificationModal', () => {
  const mockNotificationComponentState = (createModalDetails: boolean | undefined) => {
    (NotificationComponentState)[TRIGGER_TYPES.ERC20_SENT] = {
      guardFn: (n): n is NotificationServicesController.Types.INotification => true,
      createMenuItem: jest.fn(),
      createModalDetails: createModalDetails ? jest.fn() : undefined,
    };
  };

  afterEach(() => {
    delete (NotificationComponentState as { [key in TRIGGER_TYPES]?: unknown })[TRIGGER_TYPES.ERC20_SENT];
  });

  it('returns false for an invalid trigger type', () => {
    const invalidTriggerType = 'INVALID_TRIGGER' as TRIGGER_TYPES;

    const result = hasNotificationModal(invalidTriggerType);

    expect(result).toBe(false);
  });

  it('returns false when createModalDetails is undefined', () => {
    mockNotificationComponentState(undefined);

    const result = hasNotificationModal(TRIGGER_TYPES.ERC20_SENT);

    expect(result).toBe(false);
  });

  it('returns true when createModalDetails is defined', () => {
    mockNotificationComponentState(true);

    const result = hasNotificationModal(TRIGGER_TYPES.ERC20_SENT);

    expect(result).toBe(true);
  });
});
