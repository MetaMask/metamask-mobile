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
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
      getNetworkClientById: jest.fn().mockReturnValue({
        blockTracker: {},
        provider: {
          request: jest.fn().mockResolvedValue('0x1'),
        },
      }),
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
        'endowment:multichain-provider': {},
      }),
      hasPermission: jest.fn().mockReturnValue(true),
      getCaveat: jest.fn().mockReturnValue({
        type: 'authorizedScopes',
        value: {
          requiredScopes: {},
          optionalScopes: {
            'eip155:1': {},
          },
          sessionProperties: {},
          isMultichainOrigin: true,
        },
      }),
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

  const eip1193Stream = mux.createStream('metamask-provider');
  const multichainStream = mux.createStream('metamask-multichain-provider');

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
        tabId: false,
        isWalletConnect: false,
        isMMSDK: false,
        url: { current: '' },
        analytics: {},
      }),
  });

  bridge.setupProviderConnection();

  const request = (json: Json) =>
    new Promise((resolve) => {
      eip1193Stream.once('data', (chunk) => resolve(chunk));
      eip1193Stream.write(json);
    });

  const requestMultichain = (json: Json) =>
    new Promise((resolve) => {
      multichainStream.once('data', (chunk) => resolve(chunk));
      multichainStream.write(json);
    });

  return {
    bridge,
    eip1193Stream,
    multichainStream,
    request,
    requestMultichain,
  };
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

  it('responds to a multichain JSON-RPC request', async () => {
    const { requestMultichain } = createBridge();

    const response = await requestMultichain({
      jsonrpc: '2.0',
      id: 1,
      method: 'wallet_invokeMethod',
      params: {
        scope: 'eip155:1',
        request: {
          method: 'eth_blockNumber',
        },
      },
    });

    expect(response).toStrictEqual({ jsonrpc: '2.0', id: 1, result: '0x1' });
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
