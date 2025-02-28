///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// eslint-disable-next-line import/no-nodejs-modules
import { Duplex } from 'stream';
import {
  createSwappableProxy,
  createEventEmitterProxy,
} from '@metamask/swappable-obj-proxy';
import { JsonRpcEngine } from '@metamask/json-rpc-engine';
import { createEngineStream } from '@metamask/json-rpc-middleware-stream';
import EthQuery from '@metamask/eth-query';

import Engine from '../Engine';
import { setupMultiplex } from '../../util/streams';
import Logger from '../../util/Logger';
import snapMethodMiddlewareBuilder from './SnapsMethodMiddleware';
import { SubjectType } from '@metamask/permission-controller';

import ObjectMultiplex from '@metamask/object-multiplex';
import createFilterMiddleware from '@metamask/eth-json-rpc-filters';
import createSubscriptionManager from '@metamask/eth-json-rpc-filters/subscriptionManager';
import { providerAsMiddleware } from '@metamask/eth-json-rpc-middleware';
const pump = require('pump');

interface ISnapBridgeProps {
  snapId: string;
  connectionStream: Duplex;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRPCMethodMiddleware: (args: any) => any;
}

export default class SnapBridge {
  snapId: string;
  stream: Duplex;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRPCMethodMiddleware: (args: any) => any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockTracker: any;

  #mux: typeof ObjectMultiplex;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #providerProxy: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #blockTrackerProxy: any;

  constructor({
    snapId,
    connectionStream,
    getRPCMethodMiddleware,
  }: ISnapBridgeProps) {
    Logger.log(
      '[SNAP BRIDGE LOG] Engine+setupSnapProvider: Setup bridge for Snap',
      snapId,
    );

    this.snapId = snapId;
    this.stream = connectionStream;
    this.getRPCMethodMiddleware = getRPCMethodMiddleware;
    this.deprecatedNetworkVersions = {};

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { NetworkController } = Engine.context as any;

    const { provider, blockTracker } =
      NetworkController.getProviderAndBlockTracker();

    this.#providerProxy = null;
    this.#blockTrackerProxy = null;

    this.#setProvider(provider);
    this.#setBlockTracker(blockTracker);

    this.#mux = setupMultiplex(this.stream);
  }

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #setProvider = (provider: any): void => {
    if (this.#providerProxy) {
      this.#providerProxy.setTarget(provider);
    } else {
      this.#providerProxy = createSwappableProxy(provider);
    }
    this.provider = provider;
  };

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  async getProviderState() {
    return {
      isUnlocked: this.isUnlocked(),
      ...(await this.getProviderNetworkState(this.snapId)),
    };
  }

  setupProviderConnection = () => {
    Logger.log('[SNAP BRIDGE LOG] Engine+setupProviderConnection');
    const outStream = this.#mux.createStream('metamask-provider');
    const engine = this.setupProviderEngine();

    const providerStream = createEngineStream({ engine });
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pump(outStream, providerStream, outStream, (err: any) => {
      engine.destroy();
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

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscriptionManager.events.on('notification', (message: any) =>
      engine.emit('notification', message),
    );

    // Filter and subscription polyfills
    engine.push(filterMiddleware);
    engine.push(subscriptionManager.middleware);

    const { context, controllerMessenger } = Engine;
    const { PermissionController } = context;

    engine.push(
      PermissionController.createPermissionMiddleware({
        origin: this.snapId,
      }),
    );

    engine.push(
      snapMethodMiddlewareBuilder(
        context,
        controllerMessenger,
        this.snapId,
        SubjectType.Snap,
      ),
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

  isUnlocked = (): boolean => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { KeyringController } = Engine.context as any;
    return KeyringController.isUnlocked();
  };

  async getProviderNetworkState(origin: string) {
    const networkClientId = Engine.controllerMessenger.call(
      'SelectedNetworkController:getNetworkClientIdForDomain',
      origin,
    );

    const networkClient = Engine.controllerMessenger.call(
      'NetworkController:getNetworkClientById',
      networkClientId,
    );

    const { chainId } = networkClient.configuration;

    let networkVersion = this.deprecatedNetworkVersions[networkClientId];
    if (!networkVersion) {
      const ethQuery = new EthQuery(networkClient.provider);
      networkVersion = await new Promise((resolve) => {
        ethQuery.sendAsync({ method: 'net_version' }, (error, result) => {
          if (error) {
            console.error(error);
            resolve(null);
          } else {
            resolve(result);
          }
        });
      });
      this.deprecatedNetworkVersions[networkClientId] = networkVersion;
    }

    return {
      chainId,
      networkVersion: networkVersion ?? 'loading',
    };
  }
}
///: END:ONLY_INCLUDE_IF
