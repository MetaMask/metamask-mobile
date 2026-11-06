enum ExtendedKeyringTypes {
  simple = 'Simple Key Pair',
  hd = 'HD Key Tree',
  qr = 'QR Hardware Wallet Device',
  ledger = 'Ledger Hardware',
  oneKey = 'OneKey Hardware',
  money = 'Money Keyring',
  mpcMoney = 'MPC Money Keyring',
}

export default ExtendedKeyringTypes;

/**
 * Keyring types whose accounts are Money Accounts.
 *
 * Both the SRP-derived (`Money Keyring`) and MPC (`MPC Money Keyring`)
 * variants implement message signing only — neither has `signTransaction`, so
 * their transactions must stay externally signed and publish through the
 * EIP-7702 sponsored relay.
 */
export const MONEY_KEYRING_TYPES: string[] = [
  ExtendedKeyringTypes.money,
  ExtendedKeyringTypes.mpcMoney,
];

export enum HardwareDeviceTypes {
  LEDGER = 'Ledger',
  QR = 'QR Hardware',
}
