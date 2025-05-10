import { cloneDeep } from 'lodash';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import {
  getPermittedAccountsByOrigin,
  getPermittedChainsByOrigin,
  getOriginsWithSessionProperty,
  getAuthorizedScopesByOrigin,
  getPermittedAccountsForScopesByOrigin,
} from '.';

describe('PermissionController selectors', () => {
  describe('getPermittedAccountsByOrigin', () => {
    it('memoizes and gets permitted accounts by origin', () => {
      const state1 = {
        subjects: {
          'foo.bar': {
            origin: 'foo.bar',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {
                        'eip155:1': {
                          accounts: ['eip155:1:0x1'],
                        },
                      },
                      optionalScopes: {
                        'bip122:000000000019d6689c085ae165831e93': {
                          accounts: [
                            'bip122:000000000019d6689c085ae165831e93:128Lkh3S7CkDTBZ8W7BbpsN3YYizJMp8p6',
                          ],
                        },
                      },
                      isMultichainOrigin: true,
                    },
                  },
                ],
              },
            },
          },
          'bar.baz': {
            origin: 'bar.baz',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {},
                      optionalScopes: {
                        'eip155:1': {
                          accounts: ['eip155:1:0x2'],
                        },
                      },
                      isMultichainOrigin: false,
                    },
                  },
                ],
              },
            },
          },
          'baz.bizz': {
            origin: 'baz.fizz',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {
                        'eip155:1': {
                          accounts: ['eip155:1:0x1'],
                        },
                      },
                      optionalScopes: {
                        'eip155:1': {
                          accounts: ['eip155:1:0x2'],
                        },
                      },
                      isMultichainOrigin: false,
                    },
                  },
                ],
              },
            },
          },
          'no.accounts': {
            // we shouldn't see this in the result
            permissions: {
              foobar: {},
            },
          },
        },
      };

      const expected1 = new Map([
        ['foo.bar', ['0x1']],
        ['bar.baz', ['0x2']],
        ['baz.fizz', ['0x1', '0x2']],
      ]);

      const selected1 = getPermittedAccountsByOrigin(state1);

      expect(selected1).toStrictEqual(expected1);
      // The selector should return the memoized value if state.subjects is
      // the same object
      expect(selected1).toBe(getPermittedAccountsByOrigin(state1));

      // If we mutate the state, the selector return value should be different
      // from the first.
      const state2 = cloneDeep(state1);
      delete state2.subjects['foo.bar'];

      const expected2 = new Map([
        ['bar.baz', ['0x2']],
        ['baz.fizz', ['0x1', '0x2']],
      ]);

      const selected2 = getPermittedAccountsByOrigin(state2);

      expect(selected2).toStrictEqual(expected2);
      expect(selected2).not.toBe(selected1);
      // Since we didn't mutate the state at this point, the value should once
      // again be the memoized.
      expect(selected2).toBe(getPermittedAccountsByOrigin(state2));
    });
  });

  describe('getPermittedChainsByOrigin', () => {
    it('memoizes and gets permitted chains by origin', () => {
      const state1 = {
        subjects: {
          'foo.bar': {
            origin: 'foo.bar',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {
                        'eip155:1': {
                          accounts: [],
                        },
                      },
                      optionalScopes: {
                        'bip122:000000000019d6689c085ae165831e93': {
                          accounts: [],
                        },
                      },
                      isMultichainOrigin: true,
                    },
                  },
                ],
              },
            },
          },
          'bar.baz': {
            origin: 'bar.baz',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {
                        'eip155:2': {
                          accounts: [],
                        },
                      },
                      optionalScopes: {},
                      isMultichainOrigin: true,
                    },
                  },
                ],
              },
            },
          },
          'baz.bizz': {
            origin: 'baz.fizz',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {
                        'eip155:1': {
                          accounts: [],
                        },
                      },
                      optionalScopes: {
                        'eip155:2': {
                          accounts: [],
                        },
                      },
                      isMultichainOrigin: true,
                    },
                  },
                ],
              },
            },
          },
          'no.chains': {
            // we shouldn't see this in the result
            permissions: {
              foobar: {},
            },
          },
        },
      };

      const expected1 = new Map([
        ['foo.bar', ['0x1']],
        ['bar.baz', ['0x2']],
        ['baz.fizz', ['0x1', '0x2']],
      ]);

      const selected1 = getPermittedChainsByOrigin(state1);

      expect(selected1).toStrictEqual(expected1);
      // The selector should return the memoized value if state.subjects is
      // the same object
      expect(selected1).toBe(getPermittedChainsByOrigin(state1));

      // If we mutate the state, the selector return value should be different
      // from the first.
      const state2 = cloneDeep(state1);
      delete state2.subjects['foo.bar'];

      const expected2 = new Map([
        ['bar.baz', ['0x2']],
        ['baz.fizz', ['0x1', '0x2']],
      ]);

      const selected2 = getPermittedChainsByOrigin(state2);

      expect(selected2).toStrictEqual(expected2);
      expect(selected2).not.toBe(selected1);
      // Since we didn't mutate the state at this point, the value should once
      // again be the memoized.
      expect(selected2).toBe(getPermittedChainsByOrigin(state2));
    });
  });

  describe('getOriginsWithSessionProperty', () => {
    it('returns origins that have the specified session property', () => {
      const state = {
        subjects: {
          'dapp1.example.com': {
            origin: 'dapp1.example.com',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {},
                      optionalScopes: {},
                      sessionProperties: {
                        solana_accountChanged_notifications: true,
                      },
                    },
                  },
                ],
              },
            },
          },
          'dapp2.example.com': {
            origin: 'dapp2.example.com',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {},
                      optionalScopes: {},
                      sessionProperties: {
                        another_property: 'value',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const result = getOriginsWithSessionProperty(
        state,
        'solana_accountChanged_notifications',
      );

      expect(result).toStrictEqual({
        'dapp1.example.com': true,
      });
    });

    it('returns empty object when no origins have the specified session property', () => {
      const state = {
        subjects: {
          'dapp1.example.com': {
            origin: 'dapp1.example.com',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {},
                      optionalScopes: {},
                      sessionProperties: {
                        some_property: 'value',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const result = getOriginsWithSessionProperty(
        state,
        'non_existent_property',
      );

      expect(result).toStrictEqual({});
    });

    it('returns multiple origins that have the specified session property', () => {
      const state = {
        subjects: {
          'dapp1.example.com': {
            origin: 'dapp1.example.com',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {},
                      optionalScopes: {},
                      sessionProperties: {
                        solana_accountChanged_notifications: true,
                      },
                    },
                  },
                ],
              },
            },
          },
          'dapp2.example.com': {
            origin: 'dapp2.example.com',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {},
                      optionalScopes: {},
                      sessionProperties: {
                        solana_accountChanged_notifications: false,
                      },
                    },
                  },
                ],
              },
            },
          },
          'dapp3.example.com': {
            origin: 'dapp3.example.com',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {},
                      optionalScopes: {},
                      sessionProperties: {
                        other_property: 'value',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const result = getOriginsWithSessionProperty(
        state,
        'solana_accountChanged_notifications',
      );

      expect(result).toStrictEqual({
        'dapp1.example.com': true,
        'dapp2.example.com': false,
      });
    });

    it('ignores origins without CAIP-25 permissions', () => {
      const state = {
        subjects: {
          'dapp1.example.com': {
            origin: 'dapp1.example.com',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {},
                      optionalScopes: {},
                      sessionProperties: {
                        solana_accountChanged_notifications: true,
                      },
                    },
                  },
                ],
              },
            },
          },
          'dapp2.example.com': {
            origin: 'dapp2.example.com',
            permissions: {
              eth_accounts: {
                caveats: [],
              },
            },
          },
        },
      };

      const result = getOriginsWithSessionProperty(
        state,
        'solana_accountChanged_notifications',
      );

      expect(result).toStrictEqual({
        'dapp1.example.com': true,
      });
    });

    it('ignores origins with CAIP-25 permissions but without sessionProperties', () => {
      const state = {
        subjects: {
          'dapp1.example.com': {
            origin: 'dapp1.example.com',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {},
                      optionalScopes: {},
                      // No sessionProperties
                    },
                  },
                ],
              },
            },
          },
          'dapp2.example.com': {
            origin: 'dapp2.example.com',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {},
                      optionalScopes: {},
                      sessionProperties: {
                        solana_accountChanged_notifications: true,
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const result = getOriginsWithSessionProperty(
        state,
        'solana_accountChanged_notifications',
      );

      expect(result).toStrictEqual({
        'dapp2.example.com': true,
      });
    });

    it('handles empty subjects', () => {
      const state = {
        subjects: {},
      };

      const result = getOriginsWithSessionProperty(state, 'any_property');

      expect(result).toStrictEqual({});
    });
  });
  describe('getPermittedAccountsForScopesByOrigin', () => {
    it('memoizes and gets permitted accounts by origin for specific scopes', () => {
      const state1 = {
        subjects: {
          'foo.bar': {
            origin: 'foo.bar',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {
                        'eip155:1': {
                          accounts: ['eip155:1:0x1'],
                        },
                      },
                      optionalScopes: {
                        'eip155:2': {
                          accounts: ['eip155:2:0x2'],
                        },
                      },
                      isMultichainOrigin: true,
                    },
                  },
                ],
              },
            },
          },
          'bar.baz': {
            origin: 'bar.baz',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {},
                      optionalScopes: {
                        'eip155:1': {
                          accounts: ['eip155:1:0x3'],
                        },
                        'eip155:3': {
                          accounts: ['eip155:3:0x4'],
                        },
                      },
                      isMultichainOrigin: false,
                    },
                  },
                ],
              },
            },
          },
          'baz.fizz': {
            origin: 'baz.fizz',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {
                        'eip155:1': {
                          accounts: ['eip155:1:0x5'],
                        },
                      },
                      optionalScopes: {
                        'eip155:2': {
                          accounts: ['eip155:2:0x6'],
                        },
                      },
                      isMultichainOrigin: false,
                    },
                  },
                ],
              },
            },
          },
          'no.accounts': {
            // we shouldn't see this in the result
            permissions: {
              foobar: {},
            },
          },
        },
      };

      // Test with specific scopes
      const scopes1 = ['eip155:1'];
      const expected1 = new Map([
        ['foo.bar', ['eip155:1:0x1']],
        ['bar.baz', ['eip155:1:0x3']],
        ['baz.fizz', ['eip155:1:0x5']],
      ]);

      const selected1 = getPermittedAccountsForScopesByOrigin(state1, scopes1);

      expect(selected1).toStrictEqual(expected1);
      // The selector should return the memoized value if state.subjects and scopes are
      // the same objects
      expect(selected1).toBe(
        getPermittedAccountsForScopesByOrigin(state1, scopes1),
      );

      // Test with different scopes
      const scopes2 = ['eip155:2'];
      const expected2 = new Map([
        ['foo.bar', ['eip155:2:0x2']],
        ['baz.fizz', ['eip155:2:0x6']],
      ]);

      const selected2 = getPermittedAccountsForScopesByOrigin(state1, scopes2);

      expect(selected2).toStrictEqual(expected2);
      expect(selected2).not.toBe(selected1);
      expect(selected2).toBe(
        getPermittedAccountsForScopesByOrigin(state1, scopes2),
      );

      // Test with multiple scopes
      const scopes3 = ['eip155:1', 'eip155:2'];
      const expected3 = new Map([
        ['foo.bar', ['eip155:1:0x1', 'eip155:2:0x2']],
        ['bar.baz', ['eip155:1:0x3']],
        ['baz.fizz', ['eip155:1:0x5', 'eip155:2:0x6']],
      ]);

      const selected3 = getPermittedAccountsForScopesByOrigin(state1, scopes3);

      expect(selected3).toStrictEqual(expected3);
      expect(selected3).not.toBe(selected1);
      expect(selected3).not.toBe(selected2);
      expect(selected3).toBe(
        getPermittedAccountsForScopesByOrigin(state1, scopes3),
      );

      // If we mutate the state, the selector return value should be different
      const state2 = cloneDeep(state1);
      delete state2.subjects['foo.bar'];

      const expected4 = new Map([
        ['bar.baz', ['eip155:1:0x3']],
        ['baz.fizz', ['eip155:1:0x5']],
      ]);

      const selected4 = getPermittedAccountsForScopesByOrigin(state2, scopes1);

      expect(selected4).toStrictEqual(expected4);
      expect(selected4).not.toBe(selected1);
      expect(selected4).toBe(
        getPermittedAccountsForScopesByOrigin(state2, scopes1),
      );
    });

    it('returns empty map when no origins have accounts for the specified scopes', () => {
      const state = {
        subjects: {
          'foo.bar': {
            origin: 'foo.bar',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {
                        'eip155:1': {
                          accounts: ['eip155:1:0x1'],
                        },
                      },
                      optionalScopes: {},
                      isMultichainOrigin: false,
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const scopes = ['eip155:999']; // Non-existent scope
      const expected = new Map();

      const selected = getPermittedAccountsForScopesByOrigin(state, scopes);

      expect(selected).toStrictEqual(expected);
    });

    it('handles empty subjects', () => {
      const state = {
        subjects: {},
      };

      const scopes = ['eip155:1'];
      const expected = new Map();

      const selected = getPermittedAccountsForScopesByOrigin(state, scopes);

      expect(selected).toStrictEqual(expected);
    });
  });

  describe('getAuthorizedScopesByOrigin', () => {
    it('memoizes and gets authorized scopes by origin', () => {
      const state1 = {
        subjects: {
          'foo.bar': {
            origin: 'foo.bar',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {
                        'eip155:1': {
                          accounts: ['eip155:1:0x1'],
                        },
                      },
                      optionalScopes: {
                        'eip155:2': {
                          accounts: ['eip155:2:0x2'],
                        },
                      },
                      sessionProperties: {
                        property1: true,
                      },
                      isMultichainOrigin: true,
                    },
                  },
                ],
              },
            },
          },
          'bar.baz': {
            origin: 'bar.baz',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {},
                      optionalScopes: {
                        'eip155:1': {
                          accounts: ['eip155:1:0x3'],
                        },
                      },
                      sessionProperties: {},
                      isMultichainOrigin: false,
                    },
                  },
                ],
              },
            },
          },
          'no.permissions': {
            // we shouldn't see this in the result
            origin: 'no.permissions',
            permissions: {
              foobar: {},
            },
          },
        },
      };

      const expected1 = new Map([
        [
          'foo.bar',
          {
            requiredScopes: {
              'eip155:1': {
                accounts: ['eip155:1:0x1'],
              },
            },
            optionalScopes: {
              'eip155:2': {
                accounts: ['eip155:2:0x2'],
              },
            },
            sessionProperties: {
              property1: true,
            },
            isMultichainOrigin: true,
          },
        ],
        [
          'bar.baz',
          {
            requiredScopes: {},
            optionalScopes: {
              'eip155:1': {
                accounts: ['eip155:1:0x3'],
              },
            },
            sessionProperties: {},
            isMultichainOrigin: false,
          },
        ],
      ]);

      const selected1 = getAuthorizedScopesByOrigin(state1);

      expect(selected1).toStrictEqual(expected1);
      // The selector should return the memoized value if state.subjects is
      // the same object
      expect(selected1).toBe(getAuthorizedScopesByOrigin(state1));

      // If we mutate the state, the selector return value should be different
      const state2 = cloneDeep(state1);
      delete state2.subjects['foo.bar'];

      const expected2 = new Map([
        [
          'bar.baz',
          {
            requiredScopes: {},
            optionalScopes: {
              'eip155:1': {
                accounts: ['eip155:1:0x3'],
              },
            },
            sessionProperties: {},
            isMultichainOrigin: false,
          },
        ],
      ]);

      const selected2 = getAuthorizedScopesByOrigin(state2);

      expect(selected2).toStrictEqual(expected2);
      expect(selected2).not.toBe(selected1);
      // Since we didn't mutate the state at this point, the value should once
      // again be the memoized.
      expect(selected2).toBe(getAuthorizedScopesByOrigin(state2));
    });

    it('handles empty subjects', () => {
      const state = {
        subjects: {},
      };

      const expected = new Map();

      const selected = getAuthorizedScopesByOrigin(state);

      expect(selected).toStrictEqual(expected);
    });

    it('handles subjects without CAIP-25 permissions', () => {
      const state = {
        subjects: {
          'foo.bar': {
            origin: 'foo.bar',
            permissions: {
              'other.permission': {
                caveats: [],
              },
            },
          },
        },
      };

      const expected = new Map();

      const selected = getAuthorizedScopesByOrigin(state);

      expect(selected).toStrictEqual(expected);
    });

    it('handles subjects with CAIP-25 permissions but without the right caveat type', () => {
      const state = {
        subjects: {
          'foo.bar': {
            origin: 'foo.bar',
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: 'different-caveat-type',
                    value: {
                      someData: true,
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const expected = new Map();

      const selected = getAuthorizedScopesByOrigin(state);

      expect(selected).toStrictEqual(expected);
    });
  });
});
