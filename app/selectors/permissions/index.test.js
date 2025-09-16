import {
  Caip25EndowmentPermissionName,
  Caip25CaveatType,
} from '@metamask/chain-agnostic-permission';
import { getAuthorizedScopes } from '.';
import { cloneDeep } from 'lodash';

describe('PermissionController selectors', () => {
  describe('getAuthorizedScopes', () => {
    it('memoizes and gets authorized scopes for the subject', () => {
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
        },
      };

      const expected1 = {
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
      };

      const selected1 = getAuthorizedScopes('foo.bar')(state1);

      expect(selected1).toStrictEqual(expected1);
      // The selector should return the memoized value if state.subjects is
      // the same object
      expect(selected1).toBe(getAuthorizedScopes('foo.bar')(state1));

      // If we mutate the state, the selector return value should be different
      const state2 = cloneDeep(state1);
      state2.subjects['foo.bar'].permissions[
        Caip25EndowmentPermissionName
      ].caveats[0].value.requiredScopes = {};

      const expected2 = {
        requiredScopes: {},
        optionalScopes: {
          'eip155:2': {
            accounts: ['eip155:2:0x2'],
          },
        },
        sessionProperties: {
          property1: true,
        },
        isMultichainOrigin: true,
      };

      const selected2 = getAuthorizedScopes('foo.bar')(state2);

      expect(selected2).toStrictEqual(expected2);
      expect(selected2).not.toBe(selected1);
      // Since we didn't mutate the state at this point, the value should once
      // again be the memoized.
      expect(selected2).toBe(getAuthorizedScopes('foo.bar')(state2));
    });

    it('returns undefined for empty subjects', () => {
      const state = {
        subjects: {},
      };

      const selected = getAuthorizedScopes('foo.bar')(state);
      expect(selected).toStrictEqual({
        requiredScopes: {},
        optionalScopes: {},
      });
    });

    it('returns undefined for subject without CAIP-25 permissions', () => {
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

      const selected = getAuthorizedScopes('foo.bar')(state);
      expect(selected).toBeUndefined();
    });

    it('returns undefined for subject with CAIP-25 permissions but wrong caveat type', () => {
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

      const selected = getAuthorizedScopes('foo.bar')(state);
      expect(selected).toBeUndefined();
    });
  });
});
