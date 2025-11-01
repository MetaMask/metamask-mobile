import QuickCrypto from 'react-native-quick-crypto';

/**
 * Generates a unique order ID using react-native-quick-crypto's randomUUID
 * @returns A unique order ID string
 */
export function generateOrderId(): string {
  return QuickCrypto.randomUUID();
}
