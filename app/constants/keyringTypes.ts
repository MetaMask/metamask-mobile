export const QR_HARDWARE = 'QR Hardware Wallet Device';
export const LEDGER_HARDWARE = 'Ledger Hardware';
import { KeyringTypes } from '@metamask/keyring-controller';

export enum ExtendedKeyringTypes {
  simple = KeyringTypes.simple,
  hd = KeyringTypes.hd,
  qr = KeyringTypes.qr,
  ledger = 'Ledger Hardware',
}
