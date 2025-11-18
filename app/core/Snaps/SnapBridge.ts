// eslint-disable-next-line import/no-nodejs-modules
import { Duplex } from 'stream';
// @ts-expect-error - No types declarations
import pump from 'pump';

import { JsonRpcEngine, JsonRpcMiddleware } from '@metamask/json-rpc-engine';
// @ts-expect-error - No types declarations
import createFilterMiddleware from '@metamask/eth-json-rpc-filters';
// @ts-expect-error - No types declarations
import createSubscriptionManager from '@metamask/eth-json-rpc-filters/subscriptionManager';
import EthQuery, { JsonRpcParams } from '@metamask/eth-query';
import {
  createSelectedNetworkMiddleware,
  SelectedNetworkControllerMessenger,
} from '@metamask/selected-network-controller';
import { createPreinstalledSnapsMiddleware } from '@metamask/snaps-rpc-methods';
import { SubjectType } from '@metamask/permission-controller';
import { providerAsMiddleware } from '@metamask/eth-json-rpc-middleware';
import { createEngineStream } from '@metamask/json-rpc-middleware-stream';
import { SnapId } from '@metamask/snaps-sdk';
import { Json } from '@metamask/utils';

import Engine from '../Engine';
import { setupMultiplex } from '../../util/streams';
import Logger from '../../util/Logger';
import { createOriginMiddleware } from '../../util/middlewares';
import { RPCMethodsMiddleParameters } from '../RPCMethods/RPCMethodMiddleware';
import snapMethodMiddlewareBuilder from './SnapsMethodMiddleware';
import { isSnapPreinstalled } from '../SnapKeyring/utils/snaps';

/**
 * Type definition for the GetRPCMethodMiddleware function.
 */
type GetRPCMethodMiddleware = ({
  hostname,
  getProviderState,
}: {
  hostname: RPCMethodsMiddleParameters['hostname'];
  getProviderState: RPCMethodsMiddleParameters['getProviderState'];
}) => JsonRpcMiddleware<JsonRpcParams, Json>;

/**
 * A bridge for connecting the client Ethereum provider to a Snap's execution environment.
 *
 * @param params - The parameters for the SnapBridge.
 * @param params.snapId - The ID of the Snap.
 * @param params.connectionStream - The stream to connect to the Snap.
 * @param params.getRPCMethodMiddleware - A function to get the RPC method middleware.
 */
export default class SnapBridge {
  snapId: string;
  stream: Duplex;
  getRPCMethodMiddleware: GetRPCMethodMiddleware;
  deprecatedNetworkVersions: Record<string, string | null> = {};

  constructor({
    snapId,
    connectionStream,
    getRPCMethodMiddleware,
  }: {
    snapId: string;
    connectionStream: Duplex;
    getRPCMethodMiddleware: GetRPCMethodMiddleware;
  }) {
    Logger.log('[SNAP BRIDGE] Initializing SnapBridge for Snap:', snapId);

    this.snapId = snapId;
    this.stream = connectionStream;
    this.getRPCMethodMiddleware = getRPCMethodMiddleware;
  }

  /**
   * Checks if the wallet is unlocked.
   * @returns A boolean indicating if the wallet is unlocked.
   */
  #isUnlocked() {
    return Engine.context.KeyringController.isUnlocked();
  }

  /**
   * Gets the network state for the provider based on the origin.
   * @param origin - The origin of the request.
   * @returns An object containing the chain ID and network version.
   */
  async #getProviderNetworkState(origin: string) {
    const { controllerMessenger } = Engine;

    const networkClientId = controllerMessenger.call(
      'SelectedNetworkController:getNetworkClientIdForDomain',
      origin,
    );

    const networkClient = controllerMessenger.call(
      'NetworkController:getNetworkClientById',
      networkClientId,
    );

    const { chainId } = networkClient.configuration;

    const deprecatedNetworkVersion =
      this.deprecatedNetworkVersions[networkClientId];

    if (!deprecatedNetworkVersion) {
      const ethQuery = new EthQuery(networkClient.provider);

      const networkVersion: string | null = await new Promise((resolve) => {
        ethQuery.sendAsync({ method: 'net_version' }, (error, result) => {
          if (error) {
            console.error(error);
            resolve(null);
          } else {
            resolve(result as string);
          }
        });
      });

      this.deprecatedNetworkVersions[networkClientId] = networkVersion;

      return {
        chainId,
        networkVersion: networkVersion ?? 'loading',
      };
    }

    return {
      chainId,
      networkVersion: deprecatedNetworkVersion,
    };
  }

  /**
   * Gets the provider state including unlock status and network information.
   * @returns An object containing the provider state.
   */
  async #getProviderState() {
    const providerState = await this.#getProviderNetworkState(this.snapId);

    return {
      isUnlocked: this.#isUnlocked(),
      ...providerState,
    };
  }

  /**
   * Sets up the provider engine for the Snap.
   * @returns The configured JSON-RPC engine.
   */
  #setupProviderEngine() {
    Logger.log('[SNAP BRIDGE] Setting up provider engine');

    const { context, controllerMessenger } = Engine;
    const { SelectedNetworkController, PermissionController } = context;
    const engine = new JsonRpcEngine();

    const proxy = SelectedNetworkController.getProviderAndBlockTracker(
      this.snapId,
    );

    const filterMiddleware = createFilterMiddleware(proxy);

    const subscriptionManager = createSubscriptionManager(proxy);
    subscriptionManager.events.on('notification', (message: Json) =>
      engine.emit('notification', message),
    );

    engine.push(
      createOriginMiddleware({ origin: this.snapId }) as JsonRpcMiddleware<
        JsonRpcParams,
        Json
      >,
    );

    engine.push(
      createSelectedNetworkMiddleware(
        controllerMessenger as unknown as SelectedNetworkControllerMessenger,
      ),
    );

    // Filter and subscription polyfills
    engine.push(filterMiddleware);
    engine.push(subscriptionManager.middleware);

    if (isSnapPreinstalled(this.snapId as SnapId)) {
      engine.push(
        createPreinstalledSnapsMiddleware({
          getPermissions: PermissionController.getPermissions.bind(
            PermissionController,
            this.snapId,
          ),
          getAllEvmAccounts: () =>
            controllerMessenger
              .call('AccountsController:listAccounts')
              .map((account) => account.address),
          grantPermissions: (approvedPermissions) =>
            controllerMessenger.call('PermissionController:grantPermissions', {
              approvedPermissions,
              subject: { origin: this.snapId },
            }),
        }),
      );
    }

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
        getProviderState: this.#getProviderState.bind(this),
      }),
    );

    // Forward to metamask primary provider
    engine.push(providerAsMiddleware(proxy.provider));

    return engine;
  }

  /**
   * Sets up the provider connection for the Snap.
   */
  setupProviderConnection() {
    Logger.log('[SNAP BRIDGE] Setting up provider connection');

    const stream = setupMultiplex(this.stream).createStream(
      'metamask-provider',
    );
    const engine = this.#setupProviderEngine();

    const providerStream = createEngineStream({ engine });

    pump(stream, providerStream, stream, (error: Error | null) => {
      engine.destroy();

      if (error) {
        Logger.log('[SNAP BRIDGE] Error with provider stream:', error);
      }
    });
  }
}
