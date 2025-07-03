<<<<<<< HEAD
import { captureException } from '@sentry/react-native';
import migrate from './082';
import { cloneDeep } from 'lodash';
import { ensureValidState } from './util';
=======
import migrate from './082';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';
>>>>>>> stable

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

<<<<<<< HEAD
describe('Migration 82', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it.each([
    {
      state: {
        engine: {
          backgroundState: {
            TokenBalancesController: 'invalid',
          },
        },
      },
      test: 'invalid TokenBalancesController state',
      expectedError:
        "FATAL ERROR: Migration 82: Invalid TokenBalancesController state error: 'string'",
    },
    {
      state: {
        engine: {
          backgroundState: {
            TokenBalancesController: {},
          },
        },
      },
      test: 'empty TokenBalancesController state',
      expectedError:
        "FATAL ERROR: Migration 82: Invalid TokenBalancesController state error: 'object'",
    },
    {
      state: {
        engine: {
          backgroundState: {
            TokenBalancesController: {
              tokenBalances: {},
            },
            TokensController: 'invalid',
          },
        },
      },
      test: 'invalid TokensController state',
      expectedError:
        "FATAL ERROR: Migration 82: Invalid TokensController state error: 'string'",
    },
    {
      state: {
        engine: {
          backgroundState: {
            TokenBalancesController: {
              tokenBalances: {},
            },
            TokensController: {},
          },
        },
      },
      test: 'empty TokensController state',
      expectedError:
        "FATAL ERROR: Migration 82: Invalid TokensController state error: 'object'",
    },
    {
      state: {
        engine: {
          backgroundState: {
            TokenBalancesController: {
              tokenBalances: {},
            },
            TokensController: {
              allTokens: {},
            },
          },
        },
      },
      test: 'TokensController state without allDetectedTokens and allIgnoredTokens',
      expectedError:
        "FATAL ERROR: Migration 82: Invalid TokensController state error: 'object'",
    },
    {
      state: {
        engine: {
          backgroundState: {
            TokenBalancesController: {
              tokenBalances: {},
            },
            TokensController: {
              allTokens: {},
              allDetectedTokens: {},
              allIgnoredTokens: {},
            },
            AccountsController: 'invalid',
          },
        },
      },
      test: 'invalid accountsController state',
      expectedError:
        "FATAL ERROR: Migration 82: Invalid AccountsController state error: 'string'",
    },
    {
      state: {
        engine: {
          backgroundState: {
            TokenBalancesController: {
              tokenBalances: {},
            },
            TokensController: {
              allTokens: {},
              allDetectedTokens: {},
              allIgnoredTokens: {},
            },
            AccountsController: {
              internalAccounts: {
                accounts: 'invalid',
              },
            },
          },
        },
      },
      test: 'invalid accountsController accounts state',
      expectedError:
        "FATAL ERROR: Migration 82: Invalid AccountsController state error: 'object'",
    },
  ])(
    'captures exception and returns state unchanged for invalid state - $test',
    ({ state, expectedError }) => {
      const orgState = cloneDeep(state);
      mockedEnsureValidState.mockReturnValue(true);

      const migratedState = migrate(state);

      // State should be unchanged
      expect(migratedState).toStrictEqual(orgState);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expectedError,
        }),
      );
    },
  );

  it('does not remove any tokens from state if all accounts in TokensController state exist in AccountsController state', () => {
    mockedEnsureValidState.mockReturnValue(true);
    const testInternalAccountAddress = '0x123';
    const oldState = {
      engine: {
        backgroundState: {
          TokenBalancesController: {
            tokenBalances: {
              [testInternalAccountAddress]: {
                '0x1': {
                  '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
                    balance: '0x5',
                  },
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [testInternalAccountAddress]: [
                  {
                    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                    aggregators: [],
                    decimals: 18,
                    image:
                      'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                    name: 'Dai',
                    symbol: 'DAI',
                  },
                ],
              },
            },
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'unknown-1',
              accounts: {
                'unknown-1': {
                  id: 'unknown-1',
                  type: 'eip155:eoa',
                  address: testInternalAccountAddress,
                  options: {},
                  metadata: {
                    name: 'Unknown Account',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [],
                  scopes: [],
                },
              },
            },
          },
        },
      },
    };
    const newStorage = migrate(oldState);

    expect(newStorage).toStrictEqual(oldState);
  });

  it('removes tokens from allTokens state and tokenBalances from TokenBalancesController state if the account does not exist in AccountsController state', () => {
    mockedEnsureValidState.mockReturnValue(true);
    const testInternalAccountAddress = '0x123';
    const removedInternalAccountAddress = '0x456';
    const oldState = {
      engine: {
        backgroundState: {
          TokenBalancesController: {
            tokenBalances: {
              [testInternalAccountAddress]: {
                '0x1': {
                  '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
                    balance: '0x5',
                  },
                },
              },
              [removedInternalAccountAddress]: {
                '0x1': {
                  '0x22222474E89094C44Da98b954EedeAC495271d0F': {
                    balance: '0x4',
                  },
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [testInternalAccountAddress]: [
                  {
                    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                    aggregators: [],
                    decimals: 18,
                    image:
                      'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                    name: 'Dai',
                    symbol: 'DAI',
                  },
                ],
                [removedInternalAccountAddress]: [
                  {
                    address: '0x22222474E89094C44Da98b954EedeAC495271d0F',
                    aggregators: [],
                    decimals: 18,
                    image:
                      'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                    name: 'Dai',
                    symbol: 'DAI',
                  },
                ],
              },
            },
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'id-1',
              accounts: {
                'id-1': {
                  id: 'id-1',
                  type: 'eip155:eoa',
                  address: testInternalAccountAddress,
                  options: {},
                  metadata: {
                    name: 'Unknown Account',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [],
                  scopes: [],
                },
              },
            },
=======
describe('Migration 082: Reset PhishingController phishingLists', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };

    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('captures exception if engine state is invalid', () => {
    const state = { invalidState: true };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      'Migration 082: Invalid engine state structure',
    );
  });

  it('captures exception if PhishingController state is invalid', () => {
    const state = {
      engine: {
        backgroundState: {
          // PhishingController is missing
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      'Migration 082: Invalid PhishingController state',
    );
  });

  it('resets PhishingController phishingLists to empty array and stalelistLastFetched to 0 while preserving other fields', () => {
    interface TestState {
      engine: {
        backgroundState: {
          PhishingController: {
            c2DomainBlocklistLastFetched: number;
            phishingLists: string[];
            whitelist: string[];
            hotlistLastFetched: number;
            stalelistLastFetched: number;
            extraProperty?: string;
          };
          OtherController: {
            shouldStayUntouched: boolean;
          };
        };
      };
    }

    const state: TestState = {
      engine: {
        backgroundState: {
          PhishingController: {
            c2DomainBlocklistLastFetched: 123456789,
            phishingLists: ['list1', 'list2'],
            whitelist: ['site1', 'site2'],
            hotlistLastFetched: 987654321,
            stalelistLastFetched: 123123123,
            extraProperty: 'should remain',
          },
          OtherController: {
            shouldStayUntouched: true,
>>>>>>> stable
          },
        },
      },
    };
<<<<<<< HEAD
    const newStorage = migrate(oldState);

    expect(newStorage).toStrictEqual({
      engine: {
        backgroundState: {
          TokenBalancesController: {
            tokenBalances: {
              [testInternalAccountAddress]: {
                '0x1': {
                  '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
                    balance: '0x5',
                  },
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [testInternalAccountAddress]: [
                  {
                    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                    aggregators: [],
                    decimals: 18,
                    image:
                      'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                    name: 'Dai',
                    symbol: 'DAI',
                  },
                ],
              },
            },
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'id-1',
              accounts: {
                'id-1': {
                  id: 'id-1',
                  type: 'eip155:eoa',
                  address: testInternalAccountAddress,
                  options: {},
                  metadata: {
                    name: 'Unknown Account',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [],
                  scopes: [],
                },
              },
            },
          },
        },
      },
    });
  });

  it('removes tokens from allTokens state and tokenBalances from TokenBalancesController state if the account does not exist in AccountsController state on different chains', () => {
    mockedEnsureValidState.mockReturnValue(true);
    const testInternalAccountAddress1 = '0x123';
    const testInternalAccountAddress2 = '0x456';
    const removedInternalAccountAddress = '0x789';
    const oldState = {
      engine: {
        backgroundState: {
          TokenBalancesController: {
            tokenBalances: {
              [testInternalAccountAddress1]: {
                '0x1': {
                  '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
                    balance: '0x5',
                  },
                },
              },
              [testInternalAccountAddress2]: {
                '0x2': {
                  '0x22222474E89094C44Da98b954EedeAC495271d0F': {
                    balance: '0x4',
                  },
                },
              },
              [removedInternalAccountAddress]: {
                '0x2': {
                  '0x33333474E89094C44Da98b954EedeAC495271d0F': {
                    balance: '0x4',
                  },
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [testInternalAccountAddress1]: [
                  {
                    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                    aggregators: [],
                    decimals: 18,
                    image:
                      'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                    name: 'Dai',
                    symbol: 'DAI',
                  },
                ],
              },
              '0x2': {
                [testInternalAccountAddress2]: [
                  {
                    address: '0x22222474E89094C44Da98b954EedeAC495271d0F',
                    aggregators: [],
                    decimals: 18,
                    image:
                      'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                    name: 'Dai',
                    symbol: 'DAI',
                  },
                ],
                [removedInternalAccountAddress]: [
                  {
                    address: '0x33333474E89094C44Da98b954EedeAC495271d0F',
                    aggregators: [],
                    decimals: 18,
                    image:
                      'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                    name: 'Dai',
                    symbol: 'DAI',
                  },
                ],
              },
            },
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'id-1',
              accounts: {
                'id-1': {
                  id: 'id-1',
                  type: 'eip155:eoa',
                  address: testInternalAccountAddress1,
                  options: {},
                  metadata: {
                    name: 'Unknown Account',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [],
                  scopes: [],
                },
                'id-2': {
                  id: 'id-2',
                  type: 'eip155:eoa',
                  address: testInternalAccountAddress2,
                  options: {},
                  metadata: {
                    name: 'Unknown Account',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [],
                  scopes: [],
                },
              },
            },
          },
        },
      },
    };
    const newStorage = migrate(oldState);

    expect(newStorage).toStrictEqual({
      engine: {
        backgroundState: {
          TokenBalancesController: {
            tokenBalances: {
              [testInternalAccountAddress1]: {
                '0x1': {
                  '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
                    balance: '0x5',
                  },
                },
              },
              [testInternalAccountAddress2]: {
                '0x2': {
                  '0x22222474E89094C44Da98b954EedeAC495271d0F': {
                    balance: '0x4',
                  },
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [testInternalAccountAddress1]: [
                  {
                    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                    aggregators: [],
                    decimals: 18,
                    image:
                      'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                    name: 'Dai',
                    symbol: 'DAI',
                  },
                ],
              },
              '0x2': {
                [testInternalAccountAddress2]: [
                  {
                    address: '0x22222474E89094C44Da98b954EedeAC495271d0F',
                    aggregators: [],
                    decimals: 18,
                    image:
                      'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
                    name: 'Dai',
                    symbol: 'DAI',
                  },
                ],
              },
            },
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'id-1',
              accounts: {
                'id-1': {
                  id: 'id-1',
                  type: 'eip155:eoa',
                  address: testInternalAccountAddress1,
                  options: {},
                  metadata: {
                    name: 'Unknown Account',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [],
                  scopes: [],
                },
                'id-2': {
                  id: 'id-2',
                  type: 'eip155:eoa',
                  address: testInternalAccountAddress2,
                  options: {},
                  metadata: {
                    name: 'Unknown Account',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [],
                  scopes: [],
                },
              },
            },
          },
        },
      },
    });
  });
});
=======

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as typeof state;

    // PhishingLists should be reset to empty array and stalelistLastFetched to 0
    expect(migratedState.engine.backgroundState.PhishingController.phishingLists).toEqual([]);
    expect(migratedState.engine.backgroundState.PhishingController.stalelistLastFetched).toBe(0);

    // Other fields should remain unchanged
    expect(migratedState.engine.backgroundState.PhishingController.c2DomainBlocklistLastFetched).toBe(123456789);
    expect(migratedState.engine.backgroundState.PhishingController.whitelist).toEqual(['site1', 'site2']);
    expect(migratedState.engine.backgroundState.PhishingController.hotlistLastFetched).toBe(987654321);
    expect(migratedState.engine.backgroundState.PhishingController.extraProperty).toBe('should remain');

    // Other controllers should remain untouched
    expect(migratedState.engine.backgroundState.OtherController).toEqual({
      shouldStayUntouched: true,
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles error during migration', () => {
    // Create state with a PhishingController that throws when phishingLists is accessed
    const state = {
      engine: {
        backgroundState: {
          PhishingController: Object.defineProperty({}, 'phishingLists', {
            get: () => {
              throw new Error('Test error');
            },
            set: () => {
              throw new Error('Test error');
            },
            configurable: true,
            enumerable: true,
          }),
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      'Migration 082: cleaning PhishingController state failed with error',
    );
  });
}); 
>>>>>>> stable
