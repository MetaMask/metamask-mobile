import {
  KeyringMetadata,
  KeyringObject,
  KeyringTypes,
} from '@metamask/keyring-controller';

export const mockSimpleKeyringAddress =
  '0xd018538C87232FF95acbCe4870629b75640a78E7';
export const mockQrKeyringAddress =
  '0xB374Ca013934e498e5baD3409147F34E6c462389';
export const mockHDKeyringAddress =
  '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
export const mockSnapAddress1 = '0x6f92dC30B1e8E71D4A33B5dF06a812B9aAbCD2e9';
export const mockSnapAddress2 = '0x8A4bD37F19C94A72E8Fe0fA97dD1422a65E53b718';

const MOCK_DEFAULT_KEYRINGS: KeyringObject[] = [
  {
    accounts: [mockSimpleKeyringAddress],
    type: KeyringTypes.simple,
  },
  {
    accounts: [mockQrKeyringAddress],
    type: KeyringTypes.qr,
  },
  {
    accounts: [mockHDKeyringAddress],
    type: KeyringTypes.hd,
  },
  {
    accounts: [mockSnapAddress1, mockSnapAddress2],
    type: KeyringTypes.snap,
  },
];

const MOCK_SIMPLE_KEYRING_METADATA: KeyringMetadata = {
  id: '01JNG66ATK17YSN0TSS6H51EE3',
  name: '',
};

const MOCK_QR_KEYRING_METADATA: KeyringMetadata = {
  id: '01JNG66NARF27JY9TGWJX385QW',
  name: '',
};

const MOCK_HD_KEYRING_METADATA: KeyringMetadata = {
  id: '01JNG7170V9X27V5NFDTY04PJ4',
  name: '',
};

const MOCK_SNAP_KEYRING_METADATA: KeyringMetadata = {
  id: '01JNG71B7GTWH0J1TSJY9891S0',
  name: '',
};

const MOCK_DEFAULT_KEYRINGS_METADATA: KeyringMetadata[] = [
  MOCK_SIMPLE_KEYRING_METADATA,
  MOCK_QR_KEYRING_METADATA,
  MOCK_HD_KEYRING_METADATA,
  MOCK_SNAP_KEYRING_METADATA,
];

export const MOCK_KEYRING_CONTROLLER_STATE = {
  isUnlocked: jest.fn(),
  getAccountKeyringType: jest.fn(),
  keyring: {
    keyrings: [
      {
        mnemonic:
          'one two three four five six seven eight nine ten eleven twelve',
      },
    ],
  },
  state: {
    keyrings: MOCK_DEFAULT_KEYRINGS,
    keyringsMetadata: MOCK_DEFAULT_KEYRINGS_METADATA,
  },
};
