import migrate from './025';

describe('Migration #25', () => {
  it('migrates state from thirdPartyMode to the new incoming transactions networks on preferences controller', () => {
    const oldState = {
      privacy: { thirdPartyApiMode: false },
      engine: {
        backgroundState: {
          PreferencesController: {
            showIncomingTransactions: {
              '0x1': true,
              '0x5': true,
              '0x38': true,
              '0x61': true,
              '0xa': true,
              '0xa869': true,
              '0xaa37dc': true,
              '0x89': true,
              '0x13881': true,
              '0xa86a': true,
              '0xfa': true,
              '0xfa2': true,
              '0xaa36a7': true,
              '0xe704': true,
              '0xe705': true,
              '0xe708': true,
              '0x504': true,
              '0x507': true,
              '0x505': true,
              '0x64': true,
            },
          },
        },
      },
    };

    const newState = migrate(oldState);
    expect(newState).toStrictEqual({
      privacy: {},
      engine: {
        backgroundState: {
          PreferencesController: {
            showIncomingTransactions: {
              '0x1': false,
              '0x5': false,
              '0x38': false,
              '0x61': false,
              '0xa': false,
              '0xa869': false,
              '0xaa37dc': false,
              '0x89': false,
              '0x13881': false,
              '0xa86a': false,
              '0xfa': false,
              '0xfa2': false,
              '0xaa36a7': false,
              '0xe704': false,
              '0xe705': false,
              '0xe708': false,
              '0x504': false,
              '0x507': false,
              '0x505': false,
              '0x64': false,
            },
          },
        },
      },
    });
  });
});
