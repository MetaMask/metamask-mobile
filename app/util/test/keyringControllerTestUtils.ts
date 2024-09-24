import { KeyringObject, KeyringTypes } from '@metamask/keyring-controller';

export const mockSimpleKeyringAddress =
  '0xd018538C87232FF95acbCe4870629b75640a78E7';
export const mockQrKeyringAddress =
  '0xB374Ca013934e498e5baD3409147F34E6c462389';
export const mockHDKeyringAddress =
  '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

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
];

export const MOCK_KEYRING_CONTROLLER_STATE = {
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
};
