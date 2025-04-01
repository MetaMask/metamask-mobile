import {
  KeyringControllerState,
  KeyringMetadata,
  KeyringObject,
  KeyringTypes,
} from '@metamask/keyring-controller';

export const MOCK_SIMPLE_ACCOUNTS = ['0x1', '0x2'];
export const MOCK_QR_ACCOUNTS = ['0x3', '0x4'];
export const MOCK_HD_ACCOUNTS = ['0x5', '0x6'];

export const MOCK_SIMPLE_KEYRING_METADATA: KeyringMetadata = {
  id: '01JNDDBYN8F1350H5GJWYPDYYM',
  name: '',
};
export const MOCK_QR_KEYRING_METADATA: KeyringMetadata = {
  id: '01JNDDC4GZNY0AG25TW3E4ZEDP',
  name: '',
};
export const MOCK_HD_KEYRING_METADATA: KeyringMetadata = {
  id: '01JPM6NFVGW8V8KKN34053JVFT',
  name: '',
};

export const MOCK_KEYRING_METADATA: KeyringMetadata[] = [
  MOCK_SIMPLE_KEYRING_METADATA,
  MOCK_QR_KEYRING_METADATA,
  MOCK_HD_KEYRING_METADATA,
];

/**
 * Represents mock keyring object with metadata merged during runtime
 * @typedef {KeyringObject[]} MockKeyringObject
 * @property {string[]} accounts - List of accounts associated with the keyring
 * @property {KeyringTypes} type - Type of keyring (simple, qr, or hd)
 * @property {KeyringMetadata} metadata - Runtime metadata associated with the keyring
 * @example
 * {
 *   accounts: ['0x1', '0x2'],
 *   type: KeyringTypes.simple,
 *   metadata: {
 *     id: '01JNDDBYN8F1350H5GJWYPDYYM',
 *     name: ''
 *   }
 * }
 */
export const MOCK_KEYRINGS_WITH_METADATA: (KeyringObject & {
  metadata: KeyringMetadata;
})[] = [
  {
    accounts: MOCK_SIMPLE_ACCOUNTS,
    type: KeyringTypes.simple,
    metadata: MOCK_SIMPLE_KEYRING_METADATA,
  },
  {
    accounts: MOCK_QR_ACCOUNTS,
    type: KeyringTypes.qr,
    metadata: MOCK_QR_KEYRING_METADATA,
  },
  {
    accounts: MOCK_HD_ACCOUNTS,
    type: KeyringTypes.hd,
    metadata: MOCK_HD_KEYRING_METADATA,
  },
];

export const MOCK_KEYRINGS: KeyringObject[] = [
  {
    accounts: MOCK_SIMPLE_ACCOUNTS,
    type: KeyringTypes.simple,
  },
  {
    accounts: MOCK_QR_ACCOUNTS,
    type: KeyringTypes.qr,
  },
  {
    accounts: MOCK_HD_ACCOUNTS,
    type: KeyringTypes.hd,
  },
];

export const MOCK_KEYRING_CONTROLLER: KeyringControllerState = {
  isUnlocked: true,
  keyrings: MOCK_KEYRINGS,
  keyringsMetadata: MOCK_KEYRING_METADATA,
};
