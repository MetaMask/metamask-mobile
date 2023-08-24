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
            accounts: ['account-stub-1'],
            type: KeyringTypes.simple,
          },
          {
            accounts: ['account-qr-stub-1'],
            type: KeyringTypes.qr,
          },
          {
            accounts: ['account-hd-stub-1'],
            type: KeyringTypes.hd,
          },
        ],
      },
    },
  },
};

export default mockedEngine;
