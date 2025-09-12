import Engine from '../../core/Engine';
import {
  getChangedAuthorization,
  getRemovedAuthorization,
  rejectOriginApprovals,
} from '.';
import { providerErrors } from '@metamask/rpc-errors';
import { ApprovalRequest } from '@metamask/approval-controller';
import { Json } from '@metamask/utils';

jest.mock('../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
  context: {
    ApprovalController: {
      reject: jest.fn(),
      state: {
        pendingApprovals: {},
      },
    },
    PermissionController: {
      requestPermissionsIncremental: jest.fn(),
      grantPermissionsIncremental: jest.fn(),
    },
  },
}));

const mockReject = Engine.context.ApprovalController.reject as jest.Mock;

describe('Permission Utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rejectOriginApprovals', () => {
    const id = '123';
    const origin = 'https://example.com';

    beforeEach(() => {
      Engine.context.ApprovalController.state.pendingApprovals = {
        [id]: { id, origin } as ApprovalRequest<Record<string, Json>>,
      };
    });

    afterEach(() => {
      Engine.context.ApprovalController.state.pendingApprovals = {};
    });

    it('rejects approval requests from given origin', () => {
      const mockId = '123';
      rejectOriginApprovals({
        deleteInterface: () => undefined,
        origin: 'https://example.com',
      });

      expect(mockReject).toHaveBeenCalledTimes(1);
      expect(mockReject).toHaveBeenCalledWith(
        mockId,
        providerErrors.userRejectedRequest(),
      );
    });
  });

  describe('getChangedAuthorization', () => {
    it('returns the new authorization if the previous value is undefined', () => {
      const newAuth = {
        requiredScopes: { 'eip155:1': { accounts: [] } },
        optionalScopes: {},
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      expect(getChangedAuthorization(newAuth, undefined)).toStrictEqual(
        expect.objectContaining({
          requiredScopes: { 'eip155:1': { accounts: [] } },
          optionalScopes: {},
        }),
      );
    });

    it('returns empty scopes if the new and previous values are the same', () => {
      const auth = {
        requiredScopes: { 'eip155:1': { accounts: [] } },
        optionalScopes: {},
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      expect(getChangedAuthorization(auth, auth)).toStrictEqual({
        requiredScopes: {},
        optionalScopes: {},
      });
    });

    it('returns the current values of changed scopes', () => {
      const previousAuth = {
        requiredScopes: {
          'eip155:1': {
            accounts: ['eip155:1:0xdead' as const],
          },
        },
        optionalScopes: {
          'eip155:5': {
            accounts: [],
          },
          'eip155:10': {
            accounts: [],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      const newAuth = {
        requiredScopes: {
          'eip155:1': {
            accounts: ['eip155:1:0xbeef' as const],
          },
        },
        optionalScopes: {
          'eip155:5': {
            accounts: ['eip155:5:0x123' as const],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      expect(getChangedAuthorization(newAuth, previousAuth)).toStrictEqual(
        expect.objectContaining({
          requiredScopes: {
            'eip155:1': {
              accounts: ['eip155:1:0xbeef'],
            },
          },
          optionalScopes: {
            'eip155:5': {
              accounts: ['eip155:5:0x123'],
            },
          },
        }),
      );
    });
  });

  describe('getRemovedAuthorization', () => {
    it('returns empty scopes if the previous value is undefined', () => {
      const newAuth = {
        requiredScopes: { 'eip155:1': { accounts: [] } },
        optionalScopes: {},
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      expect(getRemovedAuthorization(newAuth, undefined)).toStrictEqual({
        requiredScopes: {},
        optionalScopes: {},
      });
    });

    it('returns empty scopes if the new and previous values are the same', () => {
      const auth = {
        requiredScopes: { 'eip155:1': { accounts: [] } },
        optionalScopes: {},
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      expect(getRemovedAuthorization(auth, auth)).toStrictEqual({
        requiredScopes: {},
        optionalScopes: {},
      });
    });

    it('returns the removed scopes in authorizations', () => {
      const previousAuth = {
        requiredScopes: {
          'eip155:1': {
            accounts: [],
          },
        },
        optionalScopes: {
          'eip155:5': {
            accounts: [],
          },
          'eip155:10': {
            accounts: [],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      const newAuth = {
        requiredScopes: {
          'eip155:1': {
            accounts: [],
          },
        },
        optionalScopes: {
          'eip155:10': {
            accounts: [],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      expect(getRemovedAuthorization(newAuth, previousAuth)).toStrictEqual({
        requiredScopes: {},
        optionalScopes: {
          'eip155:5': {
            accounts: [],
          },
        },
      });
    });

    it('returns all previous scopes when authorization is completely removed', () => {
      const previousAuth = {
        requiredScopes: {
          'eip155:1': {
            accounts: [],
          },
        },
        optionalScopes: {
          'eip155:5': {
            accounts: [],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      expect(getRemovedAuthorization(undefined, previousAuth)).toStrictEqual(
        expect.objectContaining({
          requiredScopes: {
            'eip155:1': {
              accounts: [],
            },
          },
          optionalScopes: {
            'eip155:5': {
              accounts: [],
            },
          },
        }),
      );
    });
  });
});
