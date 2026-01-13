import {
  sanitizeDeviceName,
  ledgerDeviceUUIDToModelName,
  LEDGER_DEVICE_BLE_UUIDS_TO_MODEL_NAME,
} from './deviceNameUtils';

describe('sanitizeDeviceName', () => {
  describe('Ledger Flex devices', () => {
    it('returns "Ledger Flex" when device name is "Ledger Flex"', () => {
      const result = sanitizeDeviceName('Ledger Flex');

      expect(result).toBe('Ledger Flex');
    });

    it('returns "Ledger Flex" when device name includes version number', () => {
      const result = sanitizeDeviceName('Ledger Flex 1.0.0');

      expect(result).toBe('Ledger Flex');
    });

    it('returns "Ledger Flex" when device name includes additional text', () => {
      const result = sanitizeDeviceName('Ledger Flex Plus Edition');

      expect(result).toBe('Ledger Flex');
    });
  });

  describe('Ledger Nano X devices', () => {
    it('returns "Ledger Nano X" when device name is "Ledger Nano X"', () => {
      const result = sanitizeDeviceName('Ledger Nano X');

      expect(result).toBe('Ledger Nano X');
    });

    it('returns "Ledger Nano X" when device name includes version number', () => {
      const result = sanitizeDeviceName('Ledger Nano X 2.1.0');

      expect(result).toBe('Ledger Nano X');
    });

    it('returns "Ledger Nano X" when device name includes additional text', () => {
      const result = sanitizeDeviceName('Ledger Nano X Special Edition');

      expect(result).toBe('Ledger Nano X');
    });
  });

  describe('Ledger Nano devices', () => {
    it('returns "Ledger Nano" when device name is "Ledger Nano"', () => {
      const result = sanitizeDeviceName('Ledger Nano');

      expect(result).toBe('Ledger Nano');
    });

    it('returns "Ledger Nano" when device name is "Ledger Nano S"', () => {
      const result = sanitizeDeviceName('Ledger Nano S');

      expect(result).toBe('Ledger Nano');
    });

    it('returns "Ledger Nano" when device name is "Ledger Nano S Plus"', () => {
      const result = sanitizeDeviceName('Ledger Nano S Plus');

      expect(result).toBe('Ledger Nano');
    });

    it('returns "Ledger Nano" when device name includes version number', () => {
      const result = sanitizeDeviceName('Ledger Nano 1.6.1');

      expect(result).toBe('Ledger Nano');
    });
  });

  describe('non-Ledger devices', () => {
    it('returns original name for Keystone devices', () => {
      const result = sanitizeDeviceName('Keystone Pro');

      expect(result).toBe('Keystone Pro');
    });

    it('returns original name for AirGap Vault devices', () => {
      const result = sanitizeDeviceName('AirGap Vault');

      expect(result).toBe('AirGap Vault');
    });

    it('returns original name for other QR-based devices', () => {
      const result = sanitizeDeviceName('CoolWallet');

      expect(result).toBe('CoolWallet');
    });
  });

  describe('edge cases', () => {
    it('returns empty string when device name is undefined', () => {
      const result = sanitizeDeviceName(undefined);

      expect(result).toBe('');
    });

    it('returns empty string when device name is empty string', () => {
      const result = sanitizeDeviceName('');

      expect(result).toBe('');
    });

    it('returns original name when device name does not match known patterns', () => {
      const result = sanitizeDeviceName('Unknown Device');

      expect(result).toBe('Unknown Device');
    });
  });

  describe('priority order', () => {
    it('matches "Ledger Flex" before "Ledger Nano X"', () => {
      const result = sanitizeDeviceName('Ledger Flex X');

      expect(result).toBe('Ledger Flex');
    });

    it('matches "Ledger Nano X" before "Ledger Nano"', () => {
      const result = sanitizeDeviceName('Ledger Nano X S');

      expect(result).toBe('Ledger Nano X');
    });
  });
});

describe('ledgerDeviceUUIDToModelName', () => {
  describe('known device UUIDs', () => {
    it('returns UUID for Ledger Nano X device', () => {
      const uuid = LEDGER_DEVICE_BLE_UUIDS_TO_MODEL_NAME.LEDGER_NANO_X;

      const result = ledgerDeviceUUIDToModelName(uuid);

      expect(result).toBe('13d63400-2c97-0004-0000-4c6564676572');
    });

    it('returns UUID for Ledger Nano STAx device', () => {
      const uuid = LEDGER_DEVICE_BLE_UUIDS_TO_MODEL_NAME.LEDGER_NANO_STAx;

      const result = ledgerDeviceUUIDToModelName(uuid);

      expect(result).toBe('13d63400-2c97-6004-0000-4c6564676572');
    });

    it('returns UUID for Ledger Flex device', () => {
      const uuid = LEDGER_DEVICE_BLE_UUIDS_TO_MODEL_NAME.LEDGER_FLEX;

      const result = ledgerDeviceUUIDToModelName(uuid);

      expect(result).toBe('13d63400-2c97-3004-0000-4c6564676572');
    });
  });

  describe('unknown device UUIDs', () => {
    it('returns "Unknown" for unrecognized UUID', () => {
      const unknownUuid = '00000000-0000-0000-0000-000000000000';

      const result = ledgerDeviceUUIDToModelName(unknownUuid);

      expect(result).toBe('Unknown');
    });

    it('returns "Unknown" for random string', () => {
      const randomString = 'not-a-valid-uuid';

      const result = ledgerDeviceUUIDToModelName(randomString);

      expect(result).toBe('Unknown');
    });

    it('returns "Unknown" for empty string', () => {
      const result = ledgerDeviceUUIDToModelName('');

      expect(result).toBe('Unknown');
    });
  });

  describe('edge cases', () => {
    it('returns "Unknown" for partial UUID match', () => {
      const partialUuid = '13d63400-2c97';

      const result = ledgerDeviceUUIDToModelName(partialUuid);

      expect(result).toBe('Unknown');
    });

    it('returns "Unknown" for UUID with different casing', () => {
      const uppercaseUuid = '13D63400-2C97-0004-0000-4C6564676572';

      const result = ledgerDeviceUUIDToModelName(uppercaseUuid);

      expect(result).toBe('Unknown');
    });

    it('returns "Unknown" for UUID with extra whitespace', () => {
      const uuidWithSpace = ' 13d63400-2c97-0004-0000-4c6564676572 ';

      const result = ledgerDeviceUUIDToModelName(uuidWithSpace);

      expect(result).toBe('Unknown');
    });
  });
});
