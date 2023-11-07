import { KeyringTypes } from '@metamask/keyring-controller';

const engineModule = jest.requireActual('../../core/Engine');

const mockedEngine = {
  init: () => engineModule.default.init({}),
  context: {
    KeyringController: {
      keyring: {
        keyrings: [
          {
            mnemonic:
              'one two three four five six seven eight nine ten eleven twelve',
          },
        ],
      },
      state: {
        keyrings: [
          {
            accounts: ['0xd018538C87232FF95acbCe4870629b75640a78E7'],
            type: KeyringTypes.simple,
          },
          {
            accounts: ['0xB374Ca013934e498e5baD3409147F34E6c462389'],
            type: KeyringTypes.qr,
          },
          {
            accounts: ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F'],
            type: KeyringTypes.hd,
          },
        ],
      },
    },
  },
};

export default mockedEngine;
