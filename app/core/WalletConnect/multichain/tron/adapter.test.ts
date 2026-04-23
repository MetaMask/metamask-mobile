jest.mock('../../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AccountsController: { listAccounts: jest.fn(() => []) },
      PermissionController: { getCaveat: jest.fn(() => undefined) },
    },
  },
}));

jest.mock('../../../Permissions', () => ({
  __esModule: true,
  addPermittedAccounts: jest.fn(),
  getPermittedAccounts: jest.fn(() => []),
  getPermittedChains: jest.fn(async () => []),
}));

import { TrxAccountType, TrxScope } from '@metamask/keyring-api';
import { addPermittedAccounts } from '../../../Permissions';
import Engine from '../../../Engine';
import { tronAdapter } from './adapter';

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

describe('tronAdapter.normalizeCaipChainId', () => {
  it('converts hex chain reference to decimal', () => {
    expect(tronAdapter.normalizeCaipChainId?.('tron:0x2b6653dc')).toBe(
      'tron:728126428',
    );
  });

  it('returns decimal chain IDs unchanged', () => {
    expect(tronAdapter.normalizeCaipChainId?.('tron:728126428')).toBe(
      'tron:728126428',
    );
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
