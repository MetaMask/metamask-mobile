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
      state: {},
    },
  },
  refreshTransactionHistory: () => Promise.resolve(),
};

export default mockedEngine;
