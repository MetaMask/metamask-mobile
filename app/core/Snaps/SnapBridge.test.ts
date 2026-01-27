import { SnapId } from '@metamask/snaps-sdk';
import { Json, JsonRpcRequest, PendingJsonRpcResponse } from '@metamask/utils';
import ObjectMultiplex from '@metamask/object-multiplex';
import { JsonRpcEngineNextCallback } from '@metamask/json-rpc-engine';
// eslint-disable-next-line import/no-nodejs-modules
import { Duplex } from 'stream';
import SnapBridge from './SnapBridge';
import getRpcMethodMiddleware from '../RPCMethods/RPCMethodMiddleware';
import { setupMultiplex } from '../../util/streams';
import Engine from '../Engine/Engine';

jest.mock('../Engine/Engine', () => ({
  ...jest.requireActual('../Engine/Engine'),
  controllerMessenger: {
    call: jest.fn().mockImplementation((action) => {
      if (action === 'AccountsController:listAccounts') {
        return [
          {
            address: '0x1234567890123456789012345678901234567890',
            id: '21066553-d8c8-4cdc-af33-efc921cd3ca9',
            metadata: {
              name: 'Test Account 1',
              lastSelected: 1,
              keyring: {
                type: 'HD Key Tree',
              },
            },
          },
        ];
      }
    }),
  },
  context: {
    AccountsController: {
      listAccounts: jest.fn().mockReturnValue([
        {
          address: '0x1234567890123456789012345678901234567890',
          id: '21066553-d8c8-4cdc-af33-efc921cd3ca9',
          metadata: {
            name: 'Test Account 1',
            lastSelected: 1,
            keyring: {
              type: 'HD Key Tree',
            },
          },
        },
      ]),
    },
    ApprovalController: {
      addAndShowApprovalRequest: jest.fn(),
    },
    SelectedNetworkController: {
      getProviderAndBlockTracker: jest.fn().mockReturnValue({
        blockTracker: {},
        provider: {
          request: jest.fn().mockResolvedValue('0x1'),
        },
      }),
    },
    KeyringController: {
      isUnlocked: jest.fn().mockReturnValue(true),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
    PermissionController: {
      createPermissionMiddleware: jest
        .fn()
        .mockReturnValue(
          (
            _req: JsonRpcRequest,
            _res: PendingJsonRpcResponse,
            next: JsonRpcEngineNextCallback,
          ) => next(),
        ),
      getPermissions: jest.fn().mockReturnValue({
        'endowment:ethereum-provider': {},
      }),
      hasPermission: jest.fn(),
      getCaveat: jest.fn(),
      updateCaveat: jest.fn(),
      executeRestrictedMethod: jest.fn(),
      revokePermission: jest.fn(),
    },
  },
}));

jest.mock('../SnapKeyring/utils/snaps', () => ({
  isSnapPreinstalled: (snapId: SnapId) => snapId.includes('preinstalled'),
}));

function createBridge(snapId = 'npm:@metamask/example-snap' as SnapId) {
  const streamA = new Duplex({
    objectMode: true,
    write(chunk, _encoding, callback) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      streamB.push(chunk);
      callback();
    },
    read() {
      // no-op
    },
  });

  const streamB = new Duplex({
    objectMode: true,
    write(chunk, _encoding, callback) {
      streamA.push(chunk);
      callback();
    },
    read() {
      // no-op
    },
  });

  const mux = setupMultiplex(streamA) as ObjectMultiplex;

  const streamAMux = mux.createStream('metamask-provider');

  const bridge = new SnapBridge({
    snapId,
    connectionStream: streamB,
    getRPCMethodMiddleware: ({ hostname, getProviderState }) =>
      getRpcMethodMiddleware({
        hostname,
        getProviderState,
        navigation: null,
        title: { current: 'Snap' },
        icon: { current: undefined },
        isHomepage: () => false,
        fromHomepage: { current: false },
        toggleUrlModal: () => null,
        tabId: false,
        isWalletConnect: false,
        isMMSDK: false,
        url: { current: '' },
        analytics: {},
        injectHomePageScripts: () => null,
      }),
  });

  bridge.setupProviderConnection();

  const request = (json: Json) =>
    new Promise((resolve) => {
      streamAMux.once('data', (chunk) => resolve(chunk));
      streamAMux.write(json);
    });

  return { bridge, stream: streamAMux, request };
}

describe('SnapBridge', () => {
  it('responds to a basic JSON-RPC request', async () => {
    const { request } = createBridge();

    const response = await request({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_blockNumber',
      params: [],
    });

    expect(response).toStrictEqual({ jsonrpc: '2.0', id: 1, result: '0x1' });
  });

  it('responds to a Snap-specific JSON-RPC request', async () => {
    const { request } = createBridge();

    const response = await request({
      jsonrpc: '2.0',
      id: 1,
      method: 'snap_getClientStatus',
      params: [],
    });

    expect(response).toStrictEqual({
      jsonrpc: '2.0',
      id: 1,
      result: expect.objectContaining({
        locked: false,
      }),
    });
  });

  it('automatically grants permissions to preinstalled Snaps', async () => {
    const snapId = 'npm:@metamask/preinstalled-example-snap' as SnapId;
    const { request } = createBridge(snapId);

    await request({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_blockNumber',
      params: [],
    });

    expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
      'PermissionController:grantPermissions',
      {
        approvedPermissions: {
          'endowment:caip25': expect.any(Object),
        },
        subject: { origin: snapId },
      },
    );
  });
});
