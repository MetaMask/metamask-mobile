/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line import/no-nodejs-modules
import { Duplex } from 'stream';
import {
  createSwappableProxy,
  createEventEmitterProxy,
} from 'swappable-obj-proxy';
import { JsonRpcEngine } from 'json-rpc-engine';
import { createEngineStream } from 'json-rpc-middleware-stream';
import { NetworksChainId } from '@metamask/controller-utils';

import Engine from '../Engine';
import { setupMultiplex } from '../../util/streams';
import Logger from '../../util/Logger';
import { getAllNetworks } from '../../util/networks';
import { createSnapMethodMiddleware } from './createSnapMethodMiddleware';

const ObjectMultiplex = require('obj-multiplex');
const createFilterMiddleware = require('eth-json-rpc-filters');
const createSubscriptionManager = require('eth-json-rpc-filters/subscriptionManager');
const providerAsMiddleware = require('eth-json-rpc-middleware/providerAsMiddleware');
const pump = require('pump');

interface ISnapBridgeProps {
  snapId: string;
  connectionStream: Duplex;
  getRPCMethodMiddleware: (args: any) => any;
}

export default class SnapBridge {
  snapId: string;
  stream: Duplex;
  getRPCMethodMiddleware: (args: any) => any;
  provider: any;
  blockTracker: any;

  #mux: typeof ObjectMultiplex;
  #providerProxy: any;
  #blockTrackerProxy: any;

  constructor({
    snapId,
    connectionStream,
    getRPCMethodMiddleware,
  }: ISnapBridgeProps) {
    // eslint-disable-next-line no-console
    console.log(
      '[SNAP BRIDGE LOG] Engine+setupSnapProvider: Setup bridge for Snap',
      snapId,
    );
    this.snapId = snapId;
    this.stream = connectionStream;
    this.getRPCMethodMiddleware = getRPCMethodMiddleware;

    const { NetworkController } = Engine.context as any;

    const provider = NetworkController.provider;
    const blockTracker = provider._blockTracker;

    this.#providerProxy = null;
    this.#blockTrackerProxy = null;

    this.#setProvider(provider);
    this.#setBlockTracker(blockTracker);

    this.#mux = setupMultiplex(this.stream);
  }

  #setProvider = (provider: any): void => {
    if (this.#providerProxy) {
      this.#providerProxy.setTarget(provider);
    } else {
      this.#providerProxy = createSwappableProxy(provider);
    }
    this.provider = provider;
  };

  #setBlockTracker = (blockTracker: any): void => {
    if (this.#blockTrackerProxy) {
      this.#blockTrackerProxy.setTarget(blockTracker);
    } else {
      this.#blockTrackerProxy = createEventEmitterProxy(blockTracker, {
        eventFilter: 'skipInternal',
      });
    }
    this.blockTracker = blockTracker;
  };

  getProviderState() {
    const memState = this.getState();
    return {
      isUnlocked: this.isUnlocked(),
      ...this.getProviderNetworkState(memState),
    };
  }

  setupProviderConnection = () => {
    // eslint-disable-next-line no-console
    console.log('[SNAP BRIDGE LOG] Engine+setupProviderConnection');
    const outStream = this.#mux.createStream('metamask-provider');
    const engine = this.setupProviderEngine();
    const providerStream = createEngineStream({ engine });
    pump(outStream, providerStream, outStream, (err: any) => {
      // handle any middleware cleanup
      engine._middleware.forEach((mid: any) => {
        if (mid.destroy && typeof mid.destroy === 'function') {
          mid.destroy();
        }
      });
      if (err) Logger.log('Error with provider stream conn', err);
    });
  };

  setupProviderEngine = () => {
    const engine = new JsonRpcEngine();

    // create filter polyfill middleware
    const filterMiddleware = createFilterMiddleware({
      provider: this.#providerProxy,
      blockTracker: this.#blockTrackerProxy,
    });

    // create subscription polyfill middleware
    const subscriptionManager = createSubscriptionManager({
      provider: this.#providerProxy,
      blockTracker: this.#blockTrackerProxy,
    });

    subscriptionManager.events.on('notification', (message: any) =>
      engine.emit('notification', message),
    );

    // engine.push(createOriginMiddleware({ origin: this.snapId }));
    // engine.push(createLoggerMiddleware({ origin: this.snapId }));

    // Filter and subscription polyfills
    engine.push(filterMiddleware);
    engine.push(subscriptionManager.middleware);

    const { context, controllerMessenger } = Engine as any;
    const { PermissionController } = context;

    engine.push(
      createSnapMethodMiddleware(true, {
        // getAppKey: async () =>
        //   new Promise((resolve, reject) => {
        //     resolve('mockAppKey');
        //   }),
        // getUnlockPromise: () => Promise.resolve(),

        getSnaps: controllerMessenger.call.bind(
          controllerMessenger,
          'SnapController:getPermitted',
          this.snapId,
        ),

        requestPermissions: async (requestedPermissions: any) => {
          const [approvedPermissions] =
            await PermissionController.requestPermissions(
              { origin: this.snapId },
              requestedPermissions,
            );

          return Object.values(approvedPermissions);
        },
        getPermissions: PermissionController.getPermissions.bind(
          PermissionController,
          this.snapId,
        ),
        // getAccounts: (origin) => getPermittedAccounts(origin),
        installSnaps: controllerMessenger.call.bind(
          controllerMessenger,
          'SnapController:install',
          this.snapId,
        ),
      }),
    );

    engine.push(
      PermissionController.createPermissionMiddleware({
        origin: this.snapId,
      }),
    );

    // User-Facing RPC methods
    engine.push(
      this.getRPCMethodMiddleware({
        hostname: this.snapId,
        getProviderState: this.getProviderState.bind(this),
      }),
    );

    // Forward to metamask primary provider
    engine.push(providerAsMiddleware(this.#providerProxy));
    return engine;
  };

  getNetworkState = ({ network }: { network: string }) => {
    const { NetworkController } = Engine.context as any;
    const networkType = NetworkController.state.providerConfig.type;
    const networkProvider = NetworkController.state.providerConfig;

    const isInitialNetwork =
      networkType && getAllNetworks().includes(networkType);
    let chainId;

    if (isInitialNetwork) {
      chainId = NetworksChainId[networkType];
    } else if (networkType === 'rpc') {
      chainId = networkProvider.chainId;
    }
    if (chainId && !chainId.startsWith('0x')) {
      // Convert to hex
      chainId = `0x${parseInt(chainId, 10).toString(16)}`;
    }

    const result = {
      networkVersion: network,
      chainId,
    };
    return result;
  };

  isUnlocked = (): boolean => {
    const { KeyringController } = Engine.context as any;
    return KeyringController.isUnlocked();
  };

  getState = () => {
    const { context, datamodel } = Engine;
    const { KeyringController } = context as any;
    const vault = KeyringController.state.vault;
    const { network, selectedAddress } = datamodel.flatState as any;
    return {
      isInitialized: !!vault,
      isUnlocked: true,
      network,
      selectedAddress,
    };
  };

  getProviderNetworkState({ network }: { network: string }) {
    const { NetworkController } = Engine.context as any;
    const networkType = NetworkController.state.providerConfig.type;
    const networkProvider = NetworkController.state.providerConfig;

    const isInitialNetwork =
      networkType && getAllNetworks().includes(networkType);
    let chainId;

    if (isInitialNetwork) {
      chainId = NetworksChainId[networkType];
    } else if (networkType === 'rpc') {
      chainId = networkProvider.chainId;
    }
    if (chainId && !chainId.startsWith('0x')) {
      // Convert to hex
      chainId = `0x${parseInt(chainId, 10).toString(16)}`;
    }

    const result = {
      networkVersion: network,
      chainId,
    };
    return result;
  }
}
