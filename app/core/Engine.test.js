import Engine from './Engine';
import initialState from '../util/test/initial-background-state.json';

jest.unmock('./Engine');

describe('Engine', () => {
  it('should expose an API', () => {
    const engine = Engine.init({});
    expect(engine.context).toHaveProperty('AccountTrackerController');
    expect(engine.context).toHaveProperty('AddressBookController');
    expect(engine.context).toHaveProperty('AssetsContractController');
    expect(engine.context).toHaveProperty('TokenListController');
    expect(engine.context).toHaveProperty('TokenDetectionController');
    expect(engine.context).toHaveProperty('NftDetectionController');
    expect(engine.context).toHaveProperty('NftController');
    expect(engine.context).toHaveProperty('CurrencyRateController');
    expect(engine.context).toHaveProperty('KeyringController');
    expect(engine.context).toHaveProperty('NetworkController');
    expect(engine.context).toHaveProperty('PhishingController');
    expect(engine.context).toHaveProperty('PreferencesController');
    expect(engine.context).toHaveProperty('SignatureController');
    expect(engine.context).toHaveProperty('TokenBalancesController');
    expect(engine.context).toHaveProperty('TokenRatesController');
    expect(engine.context).toHaveProperty('TokensController');
    expect(engine.context).toHaveProperty('LoggingController');
  });

  it('calling Engine.init twice returns the same instance', () => {
    const engine = Engine.init({});
    const newEngine = Engine.init({});
    expect(engine).toStrictEqual(newEngine);
  });

  it('calling Engine.destroy deletes the old instance', async () => {
    const engine = Engine.init({});
    await engine.destroyEngineInstance();
    const newEngine = Engine.init({});
    expect(engine).not.toStrictEqual(newEngine);
  });

  // Use this to keep the unit test initial background state fixture up-to-date
  it('matches initial state fixture', () => {
    const engine = Engine.init({});
    let backgroundState = engine.datamodel.state;

    // deleting lastVisited from chainStatus, since its timestamp it makes the test case fail
    const { chainId, versionInfo } =
      backgroundState.PPOMController.chainStatus['0x1'];
    backgroundState = {
      ...backgroundState,
      PPOMController: {
        ...backgroundState.PPOMController,
        chainStatus: {
          ...backgroundState.PPOMController.chainStatus,
          '0x1': {
            chainId,
            versionInfo,
          },
        },
      },
      KeyringController: {
        ...backgroundState.KeyringController,
        vault: {
          cipher: 'mock-cipher',
          iv: 'mock-iv',
          lib: 'original',
        },
      },
    };

    expect(backgroundState).toStrictEqual(initialState);
  });

  describe('setSelectedAccount', () => {
    // it('sets the selected account given a valid address', () => {
    //   const MOCK_ADDRESS = '0x0';
    //   const MOCK_ADDRESS_2 = '0x1';
    //
    //   const accountUUID1 = '30313233-3435-4637-b839-383736353430';
    //   const accountUUID2 = '30313233-3435-4637-b839-383736353431';
    //   const accountsControllerInitialState = {
    //     AccountsController: {
    //       internalAccounts: {
    //         accounts: {
    //           [accountUUID1]: {
    //             address: MOCK_ADDRESS,
    //             id: accountUUID1,
    //             options: {},
    //             metadata: {
    //               name: 'Account 1',
    //               keyring: {
    //                 type: 'HD Key Tree',
    //               },
    //             },
    //             methods: [
    //               'personal_sign',
    //               'eth_sign',
    //               'eth_signTransaction',
    //               'eth_signTypedData_v1',
    //               'eth_signTypedData_v3',
    //               'eth_signTypedData_v4',
    //               'eth_prepareUserOperation',
    //               'eth_patchUserOperation',
    //               'eth_signUserOperation',
    //             ],
    //             type: 'eip155:eoa',
    //           },
    //           [accountUUID2]: {
    //             address: MOCK_ADDRESS_2,
    //             id: accountUUID2,
    //             options: {},
    //             metadata: {
    //               name: 'Account 2',
    //               keyring: {
    //                 type: 'HD Key Tree',
    //               },
    //             },
    //             methods: [
    //               'personal_sign',
    //               'eth_sign',
    //               'eth_signTransaction',
    //               'eth_signTypedData_v1',
    //               'eth_signTypedData_v3',
    //               'eth_signTypedData_v4',
    //               'eth_prepareUserOperation',
    //               'eth_patchUserOperation',
    //               'eth_signUserOperation',
    //             ],
    //             type: 'eip155:eoa',
    //           },
    //         },
    //         selectedAccount: accountUUID1,
    //       },
    //     },
    //   };
    //
    //   const preferencesControllerInitialState = {
    //     PreferencesController: {
    //       identities: {
    //         '0x0': {
    //           name: 'Account 1',
    //           address: '0x0',
    //         },
    //         '0x1': {
    //           name: 'Account 2',
    //           address: '0x1',
    //         },
    //       },
    //       selectedAddress: '0x0',
    //     },
    //   };
    //
    //   const customInitialState = {
    //     ...initialState,
    //     ...accountsControllerInitialState, // Override or add AccountsController state
    //     ...preferencesControllerInitialState, // Override or add PreferencesController state
    //   };
    //
    //   // Assuming the customInitialState is correctly merged and applied:
    //   const engine = Engine.init(customInitialState);
    //
    //   // Initially, the selectedAddress should match the default from the custom initial state
    //   expect(engine.context.PreferencesController.state.selectedAddress).toBe(
    //     MOCK_ADDRESS,
    //   );
    //
    //   expect(() => engine.setSelectedAccount(MOCK_ADDRESS_2)).not.toThrow();
    //
    //   // Assertions after setSelectedAccount should verify the update took place
    //   const selectedAccount =
    //     engine.context.PreferencesController.state.selectedAddress;
    //   expect(selectedAccount).toBe(MOCK_ADDRESS_2);
    //
    //   const selectedInternalAccount =
    //     engine.context.AccountsController.getSelectedAccount();
    //   expect(selectedInternalAccount.address).toBe(MOCK_ADDRESS_2);
    // });

    it('throws an error if no account exists for the given address', () => {
      const engine = Engine.init(initialState);
      const invalidAddress = '0xInvalidAddress';

      expect(() => engine.setSelectedAccount(invalidAddress)).toThrow(
        `No account found for address: ${invalidAddress}`,
      );
    });
  });
});
