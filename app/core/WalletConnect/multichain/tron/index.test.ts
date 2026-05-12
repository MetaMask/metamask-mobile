import { TrxAccountType } from '@metamask/keyring-api';
import { PermissionDoesNotExistError } from '@metamask/permission-controller';

import Engine from '../../../Engine';
import { addPermittedAccounts } from '../../../Permissions';

import {
  buildTronNamespace,
  buildTronScopedPermissionsNamespace,
  mapTronRequestForSnap,
  normalizeTronSnapResponse,
  proposalReferencesTron,
  seedTronPermissions,
  tronAdapter,
} from './index';

jest.mock('../../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AccountsController: {
        listAccounts: jest.fn().mockReturnValue([]),
      },
      PermissionController: {
        getCaveat: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../Permissions', () => ({
  addPermittedAccounts: jest.fn(),
}));

jest.mock('../../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

const mockedListAccounts = Engine.context.AccountsController
  .listAccounts as jest.Mock;
const mockedGetCaveat = Engine.context.PermissionController
  .getCaveat as jest.Mock;
const mockedAddPermittedAccounts = addPermittedAccounts as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedListAccounts.mockReturnValue([]);
  mockedGetCaveat.mockReturnValue(undefined);
});

describe('multichain/tron - mapTronRequestForSnap', () => {
  it('maps tron_signMessage to canonical signMessage with address and message', () => {
    const input = {
      method: 'tron_signMessage',
      params: [{ address: 'TAddress', message: '0x1234' }],
    };

    const result = mapTronRequestForSnap(input);

    expect(result).toStrictEqual({
      method: 'signMessage',
      params: { address: 'TAddress', message: '0x1234' },
    });
  });

  it('omits non-string fields when mapping tron_signMessage', () => {
    const input = {
      method: 'tron_signMessage',
      params: [{ address: 42 as unknown as string, message: '0x1234' }],
    };

    const result = mapTronRequestForSnap(input);

    expect(result).toStrictEqual({
      method: 'signMessage',
      params: { message: '0x1234' },
    });
  });

  it('maps tron_signTransaction with array params and renames raw_data_hex to rawDataHex', () => {
    const input = {
      method: 'tron_signTransaction',
      params: [
        {
          address: 'TAddress',
          transaction: { raw_data_hex: '0xabc', type: 'TransferContract' },
        },
      ],
    };

    const result = mapTronRequestForSnap(input);

    expect(result).toStrictEqual({
      method: 'signTransaction',
      params: {
        address: 'TAddress',
        transaction: { rawDataHex: '0xabc', type: 'TransferContract' },
      },
    });
  });

  it('maps tron_signTransaction when params is a single object', () => {
    const input = {
      method: 'tron_signTransaction',
      params: {
        address: 'TAddress',
        transaction: {
          raw_data_hex: '0xdef',
          type: 'TriggerSmartContract',
        },
      },
    };

    const result = mapTronRequestForSnap(input);

    expect(result).toStrictEqual({
      method: 'signTransaction',
      params: {
        address: 'TAddress',
        transaction: { rawDataHex: '0xdef', type: 'TriggerSmartContract' },
      },
    });
  });

  it('extracts type from raw_data.contract[0].type when top-level type is missing', () => {
    const input = {
      method: 'tron_signTransaction',
      params: {
        address: 'TAddress',
        tx: {
          raw_data_hex: '0x999',
          raw_data: {
            contract: [{ type: 'TriggerSmartContract' }],
          },
        },
      },
    };

    const result = mapTronRequestForSnap(input);

    expect(result).toStrictEqual({
      method: 'signTransaction',
      params: {
        address: 'TAddress',
        transaction: {
          rawDataHex: '0x999',
          type: 'TriggerSmartContract',
        },
      },
    });
  });

  it('omits address from mapped tron_signTransaction params when input omits it', () => {
    const input = {
      method: 'tron_signTransaction',
      params: [{ transaction: { raw_data_hex: '0xabc' } }],
    };

    const result = mapTronRequestForSnap(input);

    expect(result).toStrictEqual({
      method: 'signTransaction',
      params: { transaction: { rawDataHex: '0xabc' } },
    });
  });

  it('omits type from mapped tron_signTransaction transaction when missing in input', () => {
    const input = {
      method: 'tron_signTransaction',
      params: { transaction: { raw_data_hex: '0xabc' } },
    };

    const result = mapTronRequestForSnap(input);

    expect(
      (result.params as { transaction: object }).transaction,
    ).not.toHaveProperty('type');
  });

  it('renames tron_sendTransaction to canonical sendTransaction without altering params', () => {
    const input = {
      method: 'tron_sendTransaction',
      params: [{ transaction: { raw_data_hex: '0xabc' } }],
    };

    const result = mapTronRequestForSnap(input);

    expect(result).toStrictEqual({
      method: 'sendTransaction',
      params: [{ transaction: { raw_data_hex: '0xabc' } }],
    });
  });

  it('renames tron_getBalance to canonical getBalance without altering params', () => {
    const input = {
      method: 'tron_getBalance',
      params: [{ address: 'TAddress' }],
    };

    const result = mapTronRequestForSnap(input);

    expect(result).toStrictEqual({
      method: 'getBalance',
      params: [{ address: 'TAddress' }],
    });
  });

  it('passes EVM methods through unchanged', () => {
    const input = { method: 'eth_sign', params: ['0x1', '0x2'] };

    const result = mapTronRequestForSnap(input);

    expect(result).toStrictEqual({
      method: 'eth_sign',
      params: ['0x1', '0x2'],
    });
  });

  it('passes unknown tron-prefixed methods through unchanged', () => {
    const input = {
      method: 'tron_someFutureMethod',
      params: [{ foo: 'bar' }],
    };

    const result = mapTronRequestForSnap(input);

    expect(result).toStrictEqual({
      method: 'tron_someFutureMethod',
      params: [{ foo: 'bar' }],
    });
  });
});

describe('multichain/tron - normalizeTronSnapResponse', () => {
  it('returns the result unchanged for non tron_signTransaction methods', () => {
    const result = normalizeTronSnapResponse({
      method: 'tron_signMessage',
      params: [{ address: 'T' }],
      result: { signature: '0xsig' },
    });

    expect(result).toStrictEqual({ signature: '0xsig' });
  });

  it('merges signature into the original transaction object for tron_signTransaction', () => {
    const original = { raw_data_hex: '0xabc', visible: false };
    const params = [
      { address: 'TAddr', transaction: { transaction: original } },
    ];

    const result = normalizeTronSnapResponse({
      method: 'tron_signTransaction',
      params,
      result: { signature: '0xsig' },
    });

    expect(result).toStrictEqual({
      raw_data_hex: '0xabc',
      visible: false,
      signature: ['0xsig'],
    });
  });

  it('keeps an array signature as-is when the snap returns multiple signatures', () => {
    const original = { raw_data_hex: '0xabc' };
    const params = [{ transaction: { transaction: original } }];

    const result = normalizeTronSnapResponse({
      method: 'tron_signTransaction',
      params,
      result: { signature: ['0xsig1', '0xsig2'] },
    });

    expect(result).toStrictEqual({
      raw_data_hex: '0xabc',
      signature: ['0xsig1', '0xsig2'],
    });
  });

  it('returns the snap result unchanged when the result already has txID', () => {
    const original = { raw_data_hex: '0xabc' };
    const params = [{ transaction: { transaction: original } }];
    const snapResult = { txID: 'tx-123', signature: '0xsig' };

    const result = normalizeTronSnapResponse({
      method: 'tron_signTransaction',
      params,
      result: snapResult,
    });

    expect(result).toBe(snapResult);
  });

  it('returns the snap result unchanged when no original transaction is recoverable', () => {
    const snapResult = { signature: '0xsig' };

    const result = normalizeTronSnapResponse({
      method: 'tron_signTransaction',
      params: [{ address: 'TAddr' }],
      result: snapResult,
    });

    expect(result).toBe(snapResult);
  });
});

describe('multichain/tron - proposalReferencesTron', () => {
  it('returns true when proposal has a top-level required tron namespace', () => {
    const result = proposalReferencesTron({
      requiredNamespaces: { tron: { chains: ['tron:728126428'] } },
    });

    expect(result).toBe(true);
  });

  it('returns true when proposal has a top-level optional tron namespace', () => {
    const result = proposalReferencesTron({
      optionalNamespaces: { tron: { chains: ['tron:728126428'] } },
    });

    expect(result).toBe(true);
  });

  it('returns true when a non-tron namespace lists a bare tron:* chain', () => {
    const result = proposalReferencesTron({
      optionalNamespaces: {
        wallet: { chains: ['wallet:eip155', 'tron:728126428'] },
      },
    });

    expect(result).toBe(true);
  });

  it('returns false for proposals that only reference EVM namespaces', () => {
    const result = proposalReferencesTron({
      requiredNamespaces: { eip155: { chains: ['eip155:1'] } },
    });

    expect(result).toBe(false);
  });

  it('returns false when both namespaces objects are absent', () => {
    expect(proposalReferencesTron({})).toBe(false);
  });
});

describe('multichain/tron - seedTronPermissions', () => {
  it('does nothing when the wallet has no Tron EOA accounts', () => {
    mockedListAccounts.mockReturnValue([
      { type: 'eip155:eoa', address: '0xabc' },
    ]);

    seedTronPermissions('channel-1');

    expect(mockedAddPermittedAccounts).not.toHaveBeenCalled();
  });

  it('adds CAIP-10 mainnet account ids for every Tron EOA address', () => {
    mockedListAccounts.mockReturnValue([
      { type: TrxAccountType.Eoa, address: 'TAddrA' },
      { type: TrxAccountType.Eoa, address: 'TAddrB' },
      { type: 'eip155:eoa', address: '0xabc' },
    ]);

    seedTronPermissions('channel-1');

    expect(mockedAddPermittedAccounts).toHaveBeenCalledTimes(1);
    expect(mockedAddPermittedAccounts).toHaveBeenCalledWith('channel-1', [
      'tron:728126428:TAddrA',
      'tron:728126428:TAddrB',
    ]);
  });

  it('swallows errors thrown while listing accounts', () => {
    mockedListAccounts.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() => seedTronPermissions('channel-1')).not.toThrow();
    expect(mockedAddPermittedAccounts).not.toHaveBeenCalled();
  });
});

describe('multichain/tron - buildTronNamespace', () => {
  it('returns undefined when the proposal does not reference Tron', () => {
    const result = buildTronNamespace({
      proposal: { requiredNamespaces: { eip155: { chains: ['eip155:1'] } } },
    });

    expect(result).toBeUndefined();
  });

  it('uses requested tron chains and dapp methods/events when present', () => {
    mockedListAccounts.mockReturnValue([
      { type: TrxAccountType.Eoa, address: 'TAddrA' },
    ]);

    const result = buildTronNamespace({
      proposal: {
        requiredNamespaces: {
          tron: {
            chains: ['tron:0x2b6653dc'],
            methods: ['tron_signTransaction'],
            events: ['accountsChanged'],
          },
        },
      },
    });

    expect(result).toStrictEqual({
      chains: ['tron:0x2b6653dc'],
      methods: ['tron_signTransaction'],
      events: ['accountsChanged'],
      accounts: ['tron:0x2b6653dc:TAddrA'],
    });
  });

  it('falls back to default tron methods, no events, and the mainnet chain when proposal omits them', () => {
    mockedListAccounts.mockReturnValue([
      { type: TrxAccountType.Eoa, address: 'TAddrA' },
    ]);

    const result = buildTronNamespace({
      proposal: {
        requiredNamespaces: { tron: {} },
      },
    });

    expect(result?.chains).toStrictEqual(['tron:0x2b6653dc']);
    expect(result?.methods).toStrictEqual([
      'tron_signTransaction',
      'tron_signMessage',
    ]);
    expect(result?.events).toStrictEqual([]);
    expect(result?.accounts).toStrictEqual(['tron:0x2b6653dc:TAddrA']);
  });

  it('extracts addresses from existingTronAccounts when provided and skips account discovery', () => {
    const result = buildTronNamespace({
      proposal: {
        requiredNamespaces: { tron: { chains: ['tron:728126428'] } },
      },
      existingAccounts: ['tron:728126428:TExistingAddress'],
    });

    expect(result?.accounts).toStrictEqual(['tron:728126428:TExistingAddress']);
    expect(mockedListAccounts).not.toHaveBeenCalled();
  });

  it('passes through existingTronMethods/existingTronEvents when proposal omits them', () => {
    mockedListAccounts.mockReturnValue([]);

    const result = buildTronNamespace({
      proposal: {
        optionalNamespaces: { tron: { chains: ['tron:728126428'] } },
      },
      existingMethods: ['tron_customMethod'],
      existingEvents: ['tron_customEvent'],
    });

    expect(result?.methods).toStrictEqual(['tron_customMethod']);
    expect(result?.events).toStrictEqual(['tron_customEvent']);
  });

  it('produces every CAIP-10 account combination across all requested tron chains', () => {
    const result = buildTronNamespace({
      proposal: {
        requiredNamespaces: {
          tron: { chains: ['tron:728126428', 'tron:0x94a9059e'] },
        },
      },
      existingAccounts: ['tron:728126428:TAddrA'],
    });

    expect(result?.accounts).toStrictEqual([
      'tron:728126428:TAddrA',
      'tron:0x94a9059e:TAddrA',
    ]);
  });
});

describe('multichain/tron - buildTronScopedPermissionsNamespace', () => {
  it('continues building namespace when getCaveat throws PermissionDoesNotExistError', () => {
    mockedListAccounts.mockReturnValue([
      { type: TrxAccountType.Eoa, address: 'TAddrA' },
    ]);
    mockedGetCaveat.mockImplementation(() => {
      throw new PermissionDoesNotExistError('wc-topic', 'endowment:caip25');
    });

    const result = buildTronScopedPermissionsNamespace({
      channelId: 'wc-topic',
      permittedChains: ['tron:728126428'],
    });

    expect(result?.chains).toStrictEqual(['tron:728126428', 'tron:0x2b6653dc']);
    expect(result?.accounts).toContain('tron:728126428:TAddrA');
  });
});

describe('multichain/tron - tronAdapter', () => {
  it('declares the tron CAIP-2 namespace and the methods that need a redirect', () => {
    expect(tronAdapter.namespace).toBe('tron');
    expect(tronAdapter.redirectMethods).toStrictEqual([
      'tron_signTransaction',
      'tron_signMessage',
    ]);
  });

  it('delegates proposalReferencesNamespace to proposalReferencesTron', () => {
    const proposal = {
      requiredNamespaces: { tron: { chains: ['tron:728126428'] } },
    };

    expect(tronAdapter.proposalReferencesNamespace(proposal)).toBe(true);
  });

  it('skips onBeforeApprove seeding when proposal does not reference tron', () => {
    mockedListAccounts.mockReturnValue([
      { type: TrxAccountType.Eoa, address: 'TAddr' },
    ]);

    tronAdapter.onBeforeApprove?.({
      proposal: {},
      channelId: 'channel-42',
    });

    expect(mockedAddPermittedAccounts).not.toHaveBeenCalled();
  });

  it('delegates onBeforeApprove to seedTronPermissions when proposal references tron', () => {
    mockedListAccounts.mockReturnValue([
      { type: TrxAccountType.Eoa, address: 'TAddr' },
    ]);

    tronAdapter.onBeforeApprove?.({
      proposal: {
        requiredNamespaces: { tron: { chains: ['tron:728126428'] } },
      },
      channelId: 'channel-42',
    });

    expect(mockedAddPermittedAccounts).toHaveBeenCalledWith('channel-42', [
      'tron:728126428:TAddr',
    ]);
  });

  it('delegates buildNamespace to buildTronNamespace and forwards existing accounts/methods/events', () => {
    const result = tronAdapter.buildNamespace({
      proposal: {
        requiredNamespaces: { tron: { chains: ['tron:728126428'] } },
      },
      existingAccounts: ['tron:728126428:TAddr'],
      existingMethods: ['tron_customMethod'],
      existingEvents: ['tron_customEvent'],
    });

    expect(result).toStrictEqual({
      chains: ['tron:728126428'],
      methods: ['tron_customMethod'],
      events: ['tron_customEvent'],
      accounts: ['tron:728126428:TAddr'],
    });
  });

  it('delegates mapRequestForSnap to mapTronRequestForSnap', () => {
    const result = tronAdapter.mapRequestInbound({
      method: 'tron_signMessage',
      params: [{ address: 'TAddr', message: '0xdead' }],
    });

    expect(result).toStrictEqual({
      method: 'signMessage',
      params: { address: 'TAddr', message: '0xdead' },
    });
  });

  it('delegates normalizeSnapResponse to normalizeTronSnapResponse', () => {
    const original = { raw_data_hex: '0xabc' };
    const result = tronAdapter.mapRequestOutbound({
      method: 'tron_signTransaction',
      params: [{ transaction: { transaction: original } }],
      result: { signature: '0xsig' },
    });

    expect(result).toStrictEqual({
      raw_data_hex: '0xabc',
      signature: ['0xsig'],
    });
  });
});
