import {
  KeyringControllerState,
  KeyringObject,
  KeyringTypes,
} from '@metamask/keyring-controller';

export const MOCK_SIMPLE_ACCOUNTS = ['0x1', '0x2'];
export const MOCK_QR_ACCOUNTS = ['0x3', '0x4'];
export const MOCK_HD_ACCOUNTS = ['0x5', '0x6'];
export const MOCK_KEYRINGS: KeyringObject[] = [
  { accounts: MOCK_SIMPLE_ACCOUNTS, type: KeyringTypes.simple },
  { accounts: MOCK_QR_ACCOUNTS, type: KeyringTypes.qr },
  { accounts: MOCK_HD_ACCOUNTS, type: KeyringTypes.hd },
];
export const MOCK_KEYRING_CONTROLLER: KeyringControllerState = {
  isUnlocked: true,
  keyrings: MOCK_KEYRINGS,
  keyringsMetadata: [],
};
