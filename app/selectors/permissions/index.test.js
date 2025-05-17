import {
  Caip25EndowmentPermissionName,
  Caip25CaveatType,
} from '@metamask/chain-agnostic-permission';
import { getAuthorizedScopes } from '.';
import { cloneDeep } from 'lodash';

describe('PermissionController selectors', () => {
  describe('getAuthorizedScopes', () => {
    it('handles empty subject', () => {
      const state = {
        subject: null,
      };

      const selected = getAuthorizedScopes(state);

      expect(selected).toBeUndefined();
    });

    it('handles subject without CAIP-25 permissions', () => {
      const state = {
        subject: {
          origin: 'foo.bar',
          permissions: {
            'other.permission': {
              caveats: [],
            },
          },
        },
      };

      const selected = getAuthorizedScopes(state);

      expect(selected).toBeUndefined();
    });

    it('handles subject with CAIP-25 permissions but without the right caveat type', () => {
      const state = {
        subject: {
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
      };

      const selected = getAuthorizedScopes(state);

      expect(selected).toBeUndefined();
    });
  });
});
