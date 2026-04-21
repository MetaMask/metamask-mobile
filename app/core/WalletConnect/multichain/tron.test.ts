jest.mock('../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AccountsController: { listAccounts: jest.fn(() => []) },
      PermissionController: { getCaveat: jest.fn(() => undefined) },
    },
  },
}));

jest.mock('../../Permissions', () => ({
  __esModule: true,
  addPermittedAccounts: jest.fn(),
  getPermittedAccounts: jest.fn(() => []),
  getPermittedChains: jest.fn(async () => []),
}));

jest.mock('../../SnapKeyring/TronWalletSnap', () => ({
  __esModule: true,
  TRON_WALLET_SNAP_ID: 'npm:@consensys/tron-snap',
}));

import { TrxAccountType, TrxScope } from '@metamask/keyring-api';
import { addPermittedAccounts } from '../../Permissions';
import Engine from '../../Engine';
import { tronAdapter } from './tron';

const listAccountsMock = (
  Engine as unknown as {
    context: { AccountsController: { listAccounts: jest.Mock } };
  }
).context.AccountsController.listAccounts;
const getCaveatMock = (
  Engine as unknown as {
    context: { PermissionController: { getCaveat: jest.Mock } };
  }
).context.PermissionController.getCaveat;
const addPermittedAccountsMock = addPermittedAccounts as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  listAccountsMock.mockReturnValue([]);
  getCaveatMock.mockReturnValue(undefined);
});

describe('tronAdapter.buildNamespace', () => {
  it('echoes back exactly the Tron chain ids the dapp requested', async () => {
    listAccountsMock.mockReturnValue([
      { type: TrxAccountType.Eoa, address: 'TAddr1' },
    ]);

    const namespace = await tronAdapter.buildNamespace({
      proposal: {
        optionalNamespaces: {
          tron: { chains: ['tron:0x94a9059e'] },
        },
      },
      channelId: 'channel-1',
    });

    expect(namespace).toBeDefined();
    expect(namespace?.chains).toEqual(['tron:0x94a9059e']);
    expect(namespace?.accounts).toEqual(['tron:0x94a9059e:TAddr1']);
    expect(namespace?.methods).toEqual(
      expect.arrayContaining(['tron_signTransaction', 'tron_signMessage']),
    );
  });

  it('prefers addresses already permitted via scoped caveat over AccountsController', async () => {
    listAccountsMock.mockReturnValue([
      { type: TrxAccountType.Eoa, address: 'TDiscovered' },
    ]);
    getCaveatMock.mockReturnValue({
      value: {
        requiredScopes: {},
        optionalScopes: {
          'tron:0x2b6653dc': {
            accounts: ['tron:0x2b6653dc:TPermitted'],
          },
        },
        sessionProperties: {},
        isMultichainOrigin: true,
      },
    });

    const namespace = await tronAdapter.buildNamespace({
      proposal: {
        optionalNamespaces: {
          tron: { chains: ['tron:0x2b6653dc'] },
        },
      },
      channelId: 'channel-1',
    });

    expect(namespace?.accounts).toEqual(['tron:0x2b6653dc:TPermitted']);
  });

  it('returns undefined when no Tron is requested and no Tron EOAs exist', async () => {
    const namespace = await tronAdapter.buildNamespace({
      proposal: {},
      channelId: 'channel-1',
    });
    expect(namespace).toBeUndefined();
  });

  it('picks the fallback mainnet chain when no request but EOA exists', async () => {
    listAccountsMock.mockReturnValue([
      { type: TrxAccountType.Eoa, address: 'TAddr1' },
    ]);

    const namespace = await tronAdapter.buildNamespace({
      proposal: {},
      channelId: 'channel-1',
    });

    expect(namespace?.chains).toEqual([TrxScope.Mainnet]);
    expect(namespace?.accounts).toEqual([`${TrxScope.Mainnet}:TAddr1`]);
  });
});

describe('tronAdapter.onBeforeApprove', () => {
  it('adds Tron EOA accounts to the channel permissions', async () => {
    listAccountsMock.mockReturnValue([
      { type: TrxAccountType.Eoa, address: 'TAddr1' },
      { type: TrxAccountType.Eoa, address: 'TAddr2' },
    ]);

    await tronAdapter.onBeforeApprove?.({
      proposal: {},
      channelId: 'channel-42',
    });

    expect(addPermittedAccountsMock).toHaveBeenCalledWith('channel-42', [
      `${TrxScope.Mainnet}:TAddr1`,
      `${TrxScope.Mainnet}:TAddr2`,
    ]);
  });

  it('does nothing when there are no Tron EOAs', async () => {
    await tronAdapter.onBeforeApprove?.({
      proposal: {},
      channelId: 'channel-42',
    });
    expect(addPermittedAccountsMock).not.toHaveBeenCalled();
  });
});

describe('tronAdapter.adaptRequest', () => {
  const adaptRequest = tronAdapter.adaptRequest;
  if (!adaptRequest) {
    throw new Error('tronAdapter.adaptRequest must be defined');
  }

  it('maps tron_signMessage to canonical signMessage with address and message', () => {
    expect(
      adaptRequest({
        method: 'tron_signMessage',
        params: [{ address: 'TAddr', message: '0x1234' }],
      }),
    ).toEqual({
      method: 'signMessage',
      params: { address: 'TAddr', message: '0x1234' },
    });
  });

  it('maps tron_signTransaction extracting raw_data_hex and type', () => {
    expect(
      adaptRequest({
        method: 'tron_signTransaction',
        params: [
          {
            address: 'TAddr',
            transaction: {
              raw_data_hex: '0xabc',
              type: 'TransferContract',
            },
          },
        ],
      }),
    ).toEqual({
      method: 'signTransaction',
      params: {
        address: 'TAddr',
        transaction: { rawDataHex: '0xabc', type: 'TransferContract' },
      },
    });
  });

  it('maps tron_sendTransaction and tron_getBalance to canonical names', () => {
    expect(
      adaptRequest({ method: 'tron_sendTransaction', params: [] }),
    ).toEqual({ method: 'sendTransaction', params: [] });
    expect(adaptRequest({ method: 'tron_getBalance', params: [] })).toEqual({
      method: 'getBalance',
      params: [],
    });
  });

  it('returns the request unchanged for unknown methods', () => {
    expect(adaptRequest({ method: 'some_other_method', params: [1] })).toEqual({
      method: 'some_other_method',
      params: [1],
    });
  });
});

describe('tronAdapter.adaptResponse', () => {
  const adaptResponse = tronAdapter.adaptResponse;
  if (!adaptResponse) {
    throw new Error('tronAdapter.adaptResponse must be defined');
  }

  it('wraps a bare signature result into the legacy transaction+signature shape', () => {
    const wrapped = adaptResponse({
      method: 'tron_signTransaction',
      params: [
        {
          transaction: {
            transaction: { raw_data_hex: '0xabc', type: 'TransferContract' },
          },
        },
      ],
      result: { signature: '0xdeadbeef' },
    });

    expect(wrapped).toEqual({
      raw_data_hex: '0xabc',
      type: 'TransferContract',
      signature: ['0xdeadbeef'],
    });
  });

  it('leaves a fully-shaped (txID-bearing) result alone', () => {
    const result = { txID: '0xabc', signature: ['0xdef'] };
    expect(
      adaptResponse({
        method: 'tron_signTransaction',
        params: [{ transaction: { raw_data_hex: '0xabc' } }],
        result,
      }),
    ).toBe(result);
  });

  it('passes through results for non-sign methods', () => {
    const result = { balance: '123' };
    expect(
      adaptResponse({
        method: 'tron_getBalance',
        params: [],
        result,
      }),
    ).toBe(result);
  });
});
