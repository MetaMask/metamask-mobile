import { ErrorCode } from '@metamask/hw-wallet-sdk';
import {
  MOBILE_ERROR_EXTENSIONS,
  ERROR_NAME_MAPPINGS,
  ADDITIONAL_STATUS_CODE_MAPPINGS,
} from './mappings';
import { RecoveryAction } from './types';
import { HardwareWalletType } from '../helpers';
import {
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    if (params?.device) {
      return `${key} [device: ${params.device}]`;
    }
    return key;
  }),
}));

describe('MOBILE_ERROR_EXTENSIONS', () => {
  describe('has mappings for all expected error codes', () => {
    const expectedCodes = [
      ErrorCode.AuthenticationDeviceLocked,
      ErrorCode.AuthenticationDeviceBlocked,
      ErrorCode.DeviceStateEthAppClosed,
      ErrorCode.DeviceDisconnected,
      ErrorCode.DeviceNotFound,
      ErrorCode.DeviceNotReady,
      ErrorCode.DeviceMissingCapability,
      ErrorCode.DeviceStateBlindSignNotSupported,
      ErrorCode.DeviceUnresponsive,
      ErrorCode.ConnectionClosed,
      ErrorCode.ConnectionTimeout,
      ErrorCode.UserRejected,
      ErrorCode.UserCancelled,
      ErrorCode.UserConfirmationRequired,
      ErrorCode.PermissionBluetoothDenied,
      ErrorCode.PermissionLocationDenied,
      ErrorCode.PermissionNearbyDevicesDenied,
      ErrorCode.BluetoothDisabled,
      ErrorCode.BluetoothScanFailed,
      ErrorCode.BluetoothConnectionFailed,
      ErrorCode.MobileNotSupported,
      ErrorCode.Unknown,
    ];

    it.each(expectedCodes)('has mapping for %s', (code) => {
      expect(MOBILE_ERROR_EXTENSIONS[code]).toBeDefined();
    });
  });

  describe('each mapping has required properties', () => {
    it('all mappings have recoveryAction', () => {
      Object.entries(MOBILE_ERROR_EXTENSIONS).forEach(([, ext]) => {
        expect(ext?.recoveryAction).toBeDefined();
        expect(Object.values(RecoveryAction)).toContain(ext?.recoveryAction);
      });
    });

    it('all mappings have icon', () => {
      Object.entries(MOBILE_ERROR_EXTENSIONS).forEach(([, ext]) => {
        expect(ext?.icon).toBeDefined();
        expect(Object.values(IconName)).toContain(ext?.icon);
      });
    });

    it('all mappings have iconColor', () => {
      Object.entries(MOBILE_ERROR_EXTENSIONS).forEach(([, ext]) => {
        expect(ext?.iconColor).toBeDefined();
        expect(Object.values(IconColor)).toContain(ext?.iconColor);
      });
    });

    it('all mappings have getLocalizedTitle function', () => {
      Object.entries(MOBILE_ERROR_EXTENSIONS).forEach(([, ext]) => {
        expect(ext?.getLocalizedTitle).toBeDefined();
        expect(typeof ext?.getLocalizedTitle).toBe('function');
      });
    });

    it('all mappings have getLocalizedMessage function', () => {
      Object.entries(MOBILE_ERROR_EXTENSIONS).forEach(([, ext]) => {
        expect(ext?.getLocalizedMessage).toBeDefined();
        expect(typeof ext?.getLocalizedMessage).toBe('function');
      });
    });
  });

  describe('getLocalizedTitle', () => {
    it('returns localized title for AuthenticationDeviceLocked', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.AuthenticationDeviceLocked];
      const title = ext?.getLocalizedTitle(HardwareWalletType.Ledger);
      expect(title).toContain('hardware_wallet.error.device_locked_title');
    });

    it('returns localized title for AuthenticationDeviceBlocked', () => {
      const ext =
        MOBILE_ERROR_EXTENSIONS[ErrorCode.AuthenticationDeviceBlocked];
      const title = ext?.getLocalizedTitle(HardwareWalletType.Ledger);
      expect(title).toContain('hardware_wallet.error.device_locked_title');
    });

    it('returns localized title for DeviceStateEthAppClosed', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceStateEthAppClosed];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.app_not_open');
    });

    it('returns localized title for DeviceDisconnected', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceDisconnected];
      const title = ext?.getLocalizedTitle(HardwareWalletType.Ledger);
      expect(title).toContain(
        'hardware_wallet.error.device_disconnected_title',
      );
    });

    it('returns localized title for DeviceNotFound', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceNotFound];
      const title = ext?.getLocalizedTitle(HardwareWalletType.Ledger);
      expect(title).toContain('hardware_wallet.error.device_not_found_title');
    });

    it('returns localized title for DeviceNotReady', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceNotReady];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.something_went_wrong');
    });

    it('returns localized title for DeviceMissingCapability', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceMissingCapability];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.app_not_open');
    });

    it('returns localized title for BlindSignNotSupported', () => {
      const ext =
        MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceStateBlindSignNotSupported];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.blind_signing_disabled');
    });

    it('returns localized title for DeviceUnresponsive', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceUnresponsive];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.connection_timeout');
    });

    it('returns localized title for ConnectionClosed', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.ConnectionClosed];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.connection_closed');
    });

    it('returns localized title for ConnectionTimeout', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.ConnectionTimeout];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.connection_timeout');
    });

    it('returns localized title for UserRejected', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.UserRejected];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.user_cancelled');
    });

    it('returns localized title for UserCancelled', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.UserCancelled];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.user_cancelled');
    });

    it('returns localized title for UserConfirmationRequired', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.UserConfirmationRequired];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.pending_confirmation');
    });

    it('returns localized title for PermissionBluetoothDenied', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.PermissionBluetoothDenied];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.bluetooth_permission_denied');
    });

    it('returns localized title for PermissionLocationDenied', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.PermissionLocationDenied];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.location_permission_denied');
    });

    it('returns localized title for PermissionNearbyDevicesDenied', () => {
      const ext =
        MOBILE_ERROR_EXTENSIONS[ErrorCode.PermissionNearbyDevicesDenied];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe(
        'hardware_wallet.error.nearby_devices_permission_denied',
      );
    });

    it('returns localized title for BluetoothDisabled', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.BluetoothDisabled];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.bluetooth_required');
    });

    it('returns localized title for BluetoothScanFailed', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.BluetoothScanFailed];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.scan_failed');
    });

    it('returns localized title for BluetoothConnectionFailed', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.BluetoothConnectionFailed];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.connection_closed');
    });

    it('returns localized title for MobileNotSupported', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.MobileNotSupported];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.something_went_wrong');
    });

    it('returns localized title for Unknown', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.Unknown];
      const title = ext?.getLocalizedTitle();
      expect(title).toBe('hardware_wallet.error.something_went_wrong');
    });
  });

  describe('getLocalizedMessage', () => {
    it('returns localized message for AuthenticationDeviceLocked', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.AuthenticationDeviceLocked];
      const message = ext?.getLocalizedMessage(HardwareWalletType.Ledger);
      expect(message).toContain('hardware_wallet.errors.device_locked');
    });

    it('returns localized message for AuthenticationDeviceBlocked', () => {
      const ext =
        MOBILE_ERROR_EXTENSIONS[ErrorCode.AuthenticationDeviceBlocked];
      const message = ext?.getLocalizedMessage(HardwareWalletType.Ledger);
      expect(message).toContain('hardware_wallet.errors.device_locked');
    });

    it('returns localized message for DeviceStateEthAppClosed', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceStateEthAppClosed];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.app_not_open');
    });

    it('returns localized message for DeviceDisconnected', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceDisconnected];
      const message = ext?.getLocalizedMessage(HardwareWalletType.Ledger);
      expect(message).toContain('hardware_wallet.errors.device_disconnected');
    });

    it('returns localized message for DeviceNotFound', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceNotFound];
      const message = ext?.getLocalizedMessage(HardwareWalletType.Ledger);
      expect(message).toContain('hardware_wallet.errors.device_not_found');
    });

    it('returns localized message for DeviceNotReady', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceNotReady];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.device_not_ready');
    });

    it('returns localized message for DeviceMissingCapability', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceMissingCapability];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.app_not_open');
    });

    it('returns localized message for BlindSignNotSupported', () => {
      const ext =
        MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceStateBlindSignNotSupported];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.blind_signing');
    });

    it('returns localized message for DeviceUnresponsive', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceUnresponsive];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.connection_timeout');
    });

    it('returns localized message for ConnectionClosed', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.ConnectionClosed];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.connection_closed');
    });

    it('returns localized message for ConnectionTimeout', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.ConnectionTimeout];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.connection_timeout');
    });

    it('returns localized message for UserRejected', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.UserRejected];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.user_cancelled');
    });

    it('returns localized message for UserCancelled', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.UserCancelled];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.user_cancelled');
    });

    it('returns localized message for UserConfirmationRequired', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.UserConfirmationRequired];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.pending_confirmation');
    });

    it('returns localized message for PermissionBluetoothDenied', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.PermissionBluetoothDenied];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe(
        'hardware_wallet.errors.bluetooth_permission_denied',
      );
    });

    it('returns localized message for PermissionLocationDenied', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.PermissionLocationDenied];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.location_permission_denied');
    });

    it('returns localized message for PermissionNearbyDevicesDenied', () => {
      const ext =
        MOBILE_ERROR_EXTENSIONS[ErrorCode.PermissionNearbyDevicesDenied];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.nearby_permission_denied');
    });

    it('returns localized message for BluetoothDisabled', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.BluetoothDisabled];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.bluetooth_off');
    });

    it('returns localized message for BluetoothScanFailed', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.BluetoothScanFailed];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.bluetooth_scan_failed');
    });

    it('returns localized message for BluetoothConnectionFailed', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.BluetoothConnectionFailed];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe(
        'hardware_wallet.errors.bluetooth_connection_failed',
      );
    });

    it('returns localized message for MobileNotSupported', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.MobileNotSupported];
      const message = ext?.getLocalizedMessage();
      expect(message).toBe('hardware_wallet.errors.not_supported');
    });

    it('returns localized message for Unknown', () => {
      const ext = MOBILE_ERROR_EXTENSIONS[ErrorCode.Unknown];
      const message = ext?.getLocalizedMessage(HardwareWalletType.Ledger);
      expect(message).toContain('hardware_wallet.errors.unknown_error');
      expect(message).toContain('device:');
    });
  });

  describe('recovery actions', () => {
    it('OPEN_APP_SETTINGS is used for permission errors', () => {
      expect(
        MOBILE_ERROR_EXTENSIONS[ErrorCode.PermissionBluetoothDenied]
          ?.recoveryAction,
      ).toBe(RecoveryAction.OPEN_APP_SETTINGS);
      expect(
        MOBILE_ERROR_EXTENSIONS[ErrorCode.PermissionLocationDenied]
          ?.recoveryAction,
      ).toBe(RecoveryAction.OPEN_APP_SETTINGS);
      expect(
        MOBILE_ERROR_EXTENSIONS[ErrorCode.PermissionNearbyDevicesDenied]
          ?.recoveryAction,
      ).toBe(RecoveryAction.OPEN_APP_SETTINGS);
    });

    it('OPEN_BLUETOOTH_SETTINGS is used for BluetoothDisabled', () => {
      expect(
        MOBILE_ERROR_EXTENSIONS[ErrorCode.BluetoothDisabled]?.recoveryAction,
      ).toBe(RecoveryAction.OPEN_BLUETOOTH_SETTINGS);
    });

    it('ACKNOWLEDGE is used for other errors', () => {
      expect(
        MOBILE_ERROR_EXTENSIONS[ErrorCode.DeviceDisconnected]?.recoveryAction,
      ).toBe(RecoveryAction.ACKNOWLEDGE);
      expect(
        MOBILE_ERROR_EXTENSIONS[ErrorCode.UserRejected]?.recoveryAction,
      ).toBe(RecoveryAction.ACKNOWLEDGE);
      expect(MOBILE_ERROR_EXTENSIONS[ErrorCode.Unknown]?.recoveryAction).toBe(
        RecoveryAction.ACKNOWLEDGE,
      );
    });
  });
});

describe('ERROR_NAME_MAPPINGS', () => {
  it('maps DisconnectedDevice to DeviceDisconnected', () => {
    expect(ERROR_NAME_MAPPINGS.DisconnectedDevice).toBe(
      ErrorCode.DeviceDisconnected,
    );
  });

  it('maps DisconnectedDeviceDuringOperation to DeviceDisconnected', () => {
    expect(ERROR_NAME_MAPPINGS.DisconnectedDeviceDuringOperation).toBe(
      ErrorCode.DeviceDisconnected,
    );
  });

  it('maps TransportLocked to AuthenticationDeviceLocked', () => {
    expect(ERROR_NAME_MAPPINGS.TransportLocked).toBe(
      ErrorCode.AuthenticationDeviceLocked,
    );
  });

  it('maps TransportError to BluetoothConnectionFailed', () => {
    expect(ERROR_NAME_MAPPINGS.TransportError).toBe(
      ErrorCode.BluetoothConnectionFailed,
    );
  });

  it('maps LockedDeviceError to AuthenticationDeviceLocked', () => {
    expect(ERROR_NAME_MAPPINGS.LockedDeviceError).toBe(
      ErrorCode.AuthenticationDeviceLocked,
    );
  });

  it('maps LedgerTimeoutError to DeviceUnresponsive', () => {
    expect(ERROR_NAME_MAPPINGS.LedgerTimeoutError).toBe(
      ErrorCode.DeviceUnresponsive,
    );
  });

  it('maps TransportOpenUserCancelled to UserCancelled', () => {
    expect(ERROR_NAME_MAPPINGS.TransportOpenUserCancelled).toBe(
      ErrorCode.UserCancelled,
    );
  });

  it('maps BluetoothRequired to BluetoothDisabled', () => {
    expect(ERROR_NAME_MAPPINGS.BluetoothRequired).toBe(
      ErrorCode.BluetoothDisabled,
    );
  });

  it('maps PairingFailed to BluetoothConnectionFailed', () => {
    expect(ERROR_NAME_MAPPINGS.PairingFailed).toBe(
      ErrorCode.BluetoothConnectionFailed,
    );
  });

  it('maps PeerRemovedPairing to BluetoothConnectionFailed', () => {
    expect(ERROR_NAME_MAPPINGS.PeerRemovedPairing).toBe(
      ErrorCode.BluetoothConnectionFailed,
    );
  });

  it('maps UserRefusedAddress to UserRejected', () => {
    expect(ERROR_NAME_MAPPINGS.UserRefusedAddress).toBe(ErrorCode.UserRejected);
  });

  it('maps UserRefusedOnDevice to UserRejected', () => {
    expect(ERROR_NAME_MAPPINGS.UserRefusedOnDevice).toBe(
      ErrorCode.UserRejected,
    );
  });

  it('maps DeviceSocketFail to BluetoothConnectionFailed', () => {
    expect(ERROR_NAME_MAPPINGS.DeviceSocketFail).toBe(
      ErrorCode.BluetoothConnectionFailed,
    );
  });

  it('maps DeviceSocketNoBulkStatus to BluetoothConnectionFailed', () => {
    expect(ERROR_NAME_MAPPINGS.DeviceSocketNoBulkStatus).toBe(
      ErrorCode.BluetoothConnectionFailed,
    );
  });
});

describe('ADDITIONAL_STATUS_CODE_MAPPINGS', () => {
  it('maps 0x6b0c (LOCKED) to AuthenticationDeviceLocked', () => {
    expect(ADDITIONAL_STATUS_CODE_MAPPINGS[0x6b0c]).toBe(
      ErrorCode.AuthenticationDeviceLocked,
    );
  });

  it('maps 0x6a15 (WRONG_APP) to DeviceStateEthAppClosed', () => {
    expect(ADDITIONAL_STATUS_CODE_MAPPINGS[0x6a15]).toBe(
      ErrorCode.DeviceStateEthAppClosed,
    );
  });

  it('maps 0x6511 (APP_NOT_OPEN) to DeviceStateEthAppClosed', () => {
    expect(ADDITIONAL_STATUS_CODE_MAPPINGS[0x6511]).toBe(
      ErrorCode.DeviceStateEthAppClosed,
    );
  });
});
