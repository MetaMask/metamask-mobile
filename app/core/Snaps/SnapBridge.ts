// eslint-disable-next-line import/no-nodejs-modules
import { Duplex } from 'stream';
// @ts-expect-error - No types declarations
import pump from 'pump';

import { JsonRpcEngine, JsonRpcMiddleware } from '@metamask/json-rpc-engine';
// @ts-expect-error - No types declarations
import createFilterMiddleware from '@metamask/eth-json-rpc-filters';
// @ts-expect-error - No types declarations
import createSubscriptionManager from '@metamask/eth-json-rpc-filters/subscriptionManager';
import { JsonRpcParams, Json, JsonRpcRequest } from '@metamask/utils';
import {
  createSelectedNetworkMiddleware,
  SelectedNetworkControllerMessenger,
} from '@metamask/selected-network-controller';
import {
  createPreinstalledSnapsMiddleware,
  SnapEndowments,
} from '@metamask/snaps-rpc-methods';
import {
  RequestedPermissions,
  SubjectType,
} from '@metamask/permission-controller';
import { providerAsMiddleware } from '@metamask/eth-json-rpc-middleware';
import { createEngineStream } from '@metamask/json-rpc-middleware-stream';
import { SnapId } from '@metamask/snaps-sdk';
import { InternalAccount } from '@metamask/keyring-internal-api';

import Engine from '../Engine/Engine';
import { setupMultiplex } from '../../util/streams';
import Logger from '../../util/Logger';
import {
  createLoggerMiddleware,
  createOriginMiddleware,
} from '../../util/middlewares';
import { RPCMethodsMiddleParameters } from '../RPCMethods/RPCMethodMiddleware';
import snapMethodMiddlewareBuilder from './SnapsMethodMiddleware';
import { isSnapPreinstalled } from '../SnapKeyring/utils/snaps';
import { MESSAGE_TYPE } from '../createTracingMiddleware';
import {
  multichainMethodCallValidatorMiddleware,
  walletCreateSession,
  walletGetSession,
  walletInvokeMethod,
  walletRevokeSession,
} from '@metamask/multichain-api-middleware';
import { rpcErrors } from '@metamask/rpc-errors';
import createUnsupportedMethodMiddleware from '../RPCMethods/createUnsupportedMethodMiddleware';
import {
  makeMethodMiddlewareMaker,
  UNSUPPORTED_RPC_METHODS,
} from '../RPCMethods/utils';
import { MultichainRouter } from '@metamask/snaps-controllers';

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
  #snapId: SnapId;
  #stream: Duplex;
  #getRPCMethodMiddleware: GetRPCMethodMiddleware;

  constructor({
    snapId,
    connectionStream,
    getRPCMethodMiddleware,
  }: {
    snapId: SnapId;
    connectionStream: Duplex;
    getRPCMethodMiddleware: GetRPCMethodMiddleware;
  }) {
    Logger.log('[SNAP BRIDGE] Initializing SnapBridge for Snap:', snapId);

    this.#snapId = snapId;
    this.#stream = connectionStream;
    this.#getRPCMethodMiddleware = getRPCMethodMiddleware;
  }

  /**
   * Gets the provider state.
   * @returns An object containing the provider state.
   */
  #getProviderState() {
    return {
      isUnlocked: Engine.context.KeyringController.isUnlocked(),
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
      this.#snapId,
    );

    const filterMiddleware = createFilterMiddleware(proxy);

    const subscriptionManager = createSubscriptionManager(proxy);
    subscriptionManager.events.on('notification', (message: Json) =>
      engine.emit('notification', message),
    );

    engine.push(
      createOriginMiddleware({ origin: this.#snapId }) as JsonRpcMiddleware<
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

    if (isSnapPreinstalled(this.#snapId)) {
      engine.push(
        createPreinstalledSnapsMiddleware({
          getPermissions: PermissionController.getPermissions.bind(
            PermissionController,
            this.#snapId,
          ),
          getAllEvmAccounts: () =>
            controllerMessenger
              .call('AccountsController:listAccounts')
              .map((account: InternalAccount) => account.address),
          grantPermissions: (approvedPermissions) =>
            controllerMessenger.call('PermissionController:grantPermissions', {
              approvedPermissions,
              subject: { origin: this.#snapId },
            }),
        }),
      );
    }

    engine.push(
      PermissionController.createPermissionMiddleware({
        origin: this.#snapId,
      }),
    );

    engine.push(
      snapMethodMiddlewareBuilder(
        context,
        controllerMessenger,
        this.#snapId,
        SubjectType.Snap,
      ),
    );

    // User-Facing RPC methods
    engine.push(
      this.#getRPCMethodMiddleware({
        hostname: this.#snapId,
        getProviderState: this.#getProviderState.bind(this),
      }),
    );

    // Forward to metamask primary provider
    engine.push(providerAsMiddleware(proxy.provider));

    return engine;
  }

  #setupProviderEngineCaip() {
    const origin = this.#snapId;

    const { NetworkController, AccountsController, PermissionController } =
      Engine.context;

    const engine = new JsonRpcEngine();

    // Append origin to each request
    engine.push(
      createOriginMiddleware({ origin }) as JsonRpcMiddleware<
        JsonRpcParams,
        Json
      >,
    );

    engine.push(
      createLoggerMiddleware({ origin }) as JsonRpcMiddleware<
        JsonRpcParams,
        Json
      >,
    );

    engine.push((req, _res, next, end) => {
      const hasPermission = PermissionController.hasPermission(
        this.#snapId,
        SnapEndowments.MultichainProvider,
      );
      if (
        !hasPermission ||
        ![
          MESSAGE_TYPE.WALLET_CREATE_SESSION,
          MESSAGE_TYPE.WALLET_INVOKE_METHOD,
          MESSAGE_TYPE.WALLET_GET_SESSION,
          MESSAGE_TYPE.WALLET_REVOKE_SESSION,
        ].includes(req.method)
      ) {
        return end(rpcErrors.methodNotFound({ data: { method: req.method } }));
      }
      return next();
    });

    engine.push(multichainMethodCallValidatorMiddleware);

    const middlewareMaker = makeMethodMiddlewareMaker([
      // @ts-expect-error These types are currently incompatible, but work in practice.
      walletRevokeSession,
      // @ts-expect-error These types are currently incompatible, but work in practice.
      walletGetSession,
      // @ts-expect-error These types are currently incompatible, but work in practice.
      walletInvokeMethod,
      // @ts-expect-error These types are currently incompatible, but work in practice.
      walletCreateSession,
    ]);

    engine.push(
      middlewareMaker({
        findNetworkClientIdByChainId:
          NetworkController.findNetworkClientIdByChainId.bind(
            NetworkController,
          ),
        listAccounts: AccountsController.listAccounts.bind(AccountsController),
        requestPermissionsForOrigin: (
          requestedPermissions: RequestedPermissions,
          options = {},
        ) =>
          PermissionController.requestPermissions(
            { origin },
            requestedPermissions,
            options,
          ),
        getCaveatForOrigin: PermissionController.getCaveat.bind(
          PermissionController,
          origin,
        ),
        updateCaveat: PermissionController.updateCaveat.bind(
          PermissionController,
          origin,
        ),
        getSelectedNetworkClientId: () =>
          NetworkController.state.selectedNetworkClientId,
        revokePermissionForOrigin: PermissionController.revokePermission.bind(
          PermissionController,
          origin,
        ),
        getNonEvmSupportedMethods: Engine.controllerMessenger.call.bind(
          Engine.controllerMessenger,
          'MultichainRouter:getSupportedMethods',
        ),
        isNonEvmScopeSupported: Engine.controllerMessenger.call.bind(
          Engine.controllerMessenger,
          'MultichainRouter:isSupportedScope',
        ),
        handleNonEvmRequestForOrigin: (
          params: Parameters<MultichainRouter['handleRequest']>[0],
        ) =>
          Engine.controllerMessenger.call('MultichainRouter:handleRequest', {
            ...params,
            origin: this.#snapId,
          }),
        getNonEvmAccountAddresses: Engine.controllerMessenger.call.bind(
          Engine.controllerMessenger,
          'MultichainRouter:getSupportedAccounts',
        ),
        trackSessionCreatedEvent: undefined,
      }),
    );

    engine.push(
      createUnsupportedMethodMiddleware(
        new Set([
          ...UNSUPPORTED_RPC_METHODS,
          'eth_requestAccounts',
          'eth_accounts',
        ]),
      ),
    );

    // user-facing RPC methods
    engine.push(
      this.#getRPCMethodMiddleware({
        hostname: this.#snapId,
        getProviderState: this.#getProviderState.bind(this),
      }),
    );

    engine.push(async (req, res, _next, end) => {
      const { provider } = NetworkController.getNetworkClientById(
        (req as JsonRpcRequest & { networkClientId: string }).networkClientId,
      );
      res.result = await provider.request(req);
      return end();
    });

    return engine;
  }

  /**
   * Sets up the provider connection for the Snap.
   */
  setupProviderConnection() {
    Logger.log('[SNAP BRIDGE] Setting up provider connection');

    const mux = setupMultiplex(this.#stream);
    const stream = mux.createStream('metamask-provider');

    const engine = this.#setupProviderEngine();

    const providerStream = createEngineStream({ engine });

    /* istanbul ignore next 2 */
    pump(stream, providerStream, stream, (error: Error | null) => {
      engine.destroy();

      if (error) {
        Logger.log('[SNAP BRIDGE] Error with provider stream:', error);
      }
    });

    const caipStream = mux.createStream('metamask-multichain-provider');
    const caipEngine = this.#setupProviderEngineCaip();

    const caipProviderStream = createEngineStream({ engine: caipEngine });

    /* istanbul ignore next 2 */
    pump(caipStream, caipProviderStream, caipStream, (error: Error | null) => {
      caipEngine.destroy();

      if (error) {
        Logger.log('[SNAP BRIDGE] Error with CAIP provider stream:', error);
      }
    });
  }
}
