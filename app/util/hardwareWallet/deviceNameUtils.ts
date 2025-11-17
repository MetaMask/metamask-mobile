/**
 * Sanitizes device names for analytics tracking by removing any additional text
 * after known base device names. This ensures consistent device_model tracking
 * across different firmware versions or device variants.
 *
 * @param deviceName - The raw device name string from the hardware device
 * @returns The sanitized device name with any suffix removed for known devices
 *
 * @example
 * sanitizeDeviceName('Ledger Nano X 2.1.0') // returns 'Ledger Nano X'
 * sanitizeDeviceName('Ledger Flex 1.0') // returns 'Ledger Flex'
 * sanitizeDeviceName('Ledger Nano S Plus') // returns 'Ledger Nano' (strips "S Plus")
 * sanitizeDeviceName('Keystone Pro') // returns 'Keystone Pro' (unchanged)
 */
export const sanitizeDeviceName = (deviceName: string | undefined): string => {
  if (!deviceName) {
    return '';
  }

  const baseDeviceNames = ['Ledger Flex', 'Ledger Nano X', 'Ledger Nano'];

  for (const baseName of baseDeviceNames) {
    if (deviceName.startsWith(baseName)) {
      return baseName;
    }
  }

  return deviceName;
};
