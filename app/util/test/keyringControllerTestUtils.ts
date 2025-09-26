import { KeyringObject, KeyringTypes } from '@metamask/keyring-controller';

export const mockSimpleKeyringAddress =
  '0xd018538C87232FF95acbCe4870629b75640a78E7';
export const mockQrKeyringAddress =
  '0xB374Ca013934e498e5baD3409147F34E6c462389';
export const mockHDKeyringAddress =
  '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
export const mockSnapAddress1 = '0x6f92dC30B1e8E71D4A33B5dF06a812B9aAbCD2e9';
export const mockSnapAddress2 = '0x8A4bD37F19C94A72E8Fe0fA97dD1422a65E53b718';
export const mockSolanaAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
export const mockSecondHDKeyringAddress =
  '0xf5E7127d55ed72EBe33d2b0540cc82baF3E31561';
export const mockThirdHDKeyringAddress =
  '0x2A3dB4C8f9E56a7B1F3C8D2e5f6A9B8C7D4E3F2A';
export const MOCK_ENTROPY_SOURCE = '01JNG7170V9X27V5NFDTY04PJ4';
export const MOCK_ENTROPY_SOURCE_2 = '01JSJNVTJEPSHZSNWAD3JT0PJN';
export const MOCK_ENTROPY_SOURCE_3 = '01JNG66ATK17YSN0TSS6H51EE3';

const MOCK_DEFAULT_KEYRINGS: KeyringObject[] = [
  {
    accounts: [mockSimpleKeyringAddress],
    type: KeyringTypes.simple,
    metadata: {
      id: '01JNG66ATK17YSN0TSS6H51EE3',
      name: '',
    },
  },
  {
    accounts: [mockQrKeyringAddress],
    type: KeyringTypes.qr,
    metadata: {
      id: '01JNG66NARF27JY9TGWJX385QW',
      name: '',
    },
  },
  {
    accounts: [mockHDKeyringAddress],
    type: KeyringTypes.hd,
    metadata: {
      id: MOCK_ENTROPY_SOURCE,
      name: '',
    },
  },
  {
    accounts: [mockSnapAddress1, mockSnapAddress2, mockSolanaAddress],
    type: KeyringTypes.snap,
    metadata: {
      id: '01JNG71B7GTWH0J1TSJY9891S0',
      name: '',
    },
  },
  {
    accounts: [mockSecondHDKeyringAddress],
    type: KeyringTypes.hd,
    metadata: {
      id: MOCK_ENTROPY_SOURCE_2,
      name: '',
    },
  },
  {
    accounts: [mockThirdHDKeyringAddress],
    type: KeyringTypes.hd,
    metadata: {
      id: MOCK_ENTROPY_SOURCE_3,
      name: '',
    },
  },
];

export const MOCK_KEYRING_CONTROLLER_STATE = {
  isUnlocked: typeof jest !== 'undefined' ? jest.fn() : () => true,
  getAccountKeyringType:
    typeof jest !== 'undefined' ? jest.fn() : () => 'HD Key Tree',
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
  },
  keyrings: MOCK_DEFAULT_KEYRINGS,
};
