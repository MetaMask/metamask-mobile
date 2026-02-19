import { DeviceEvent } from '@metamask/hw-wallet-sdk';

describe('DeviceEvent enum', () => {
  it('should have all expected event values', () => {
    expect(DeviceEvent.Connected).toBe('connected');
    expect(DeviceEvent.Disconnected).toBe('disconnected');
    expect(DeviceEvent.AppOpened).toBe('app_opened');
    expect(DeviceEvent.AppNotOpen).toBe('app_not_open');
    expect(DeviceEvent.ConfirmationRequired).toBe('confirmation_required');
    expect(DeviceEvent.ConfirmationReceived).toBe('confirmation_received');
    expect(DeviceEvent.ConfirmationRejected).toBe('confirmation_rejected');
    expect(DeviceEvent.OperationTimeout).toBe('operation_timeout');
    expect(DeviceEvent.PermissionChanged).toBe('permission_changed');
  });
});
