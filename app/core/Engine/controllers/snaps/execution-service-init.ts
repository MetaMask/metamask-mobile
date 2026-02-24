import { AbstractExecutionService } from '@metamask/snaps-controllers';
// eslint-disable-next-line import/no-nodejs-modules
import { Duplex } from 'stream';
import { ControllerInitFunction } from '../../types';
import { ExecutionServiceMessenger } from '../../messengers/snaps';
import { createWebView, removeWebView } from '../../../../lib/snaps';
import Logger from '../../../../util/Logger';
import { SnapBridge } from '../../../Snaps';
import getRpcMethodMiddleware from '../../../RPCMethods/RPCMethodMiddleware';
import { SnapId } from '@metamask/snaps-sdk';

type WebViewExecutionServiceCtor = new (args: {
  messenger: ExecutionServiceMessenger;
  setupSnapProvider: (snapId: string, connectionStream: Duplex) => void;
  createWebView: typeof createWebView;
  removeWebView: typeof removeWebView;
}) => AbstractExecutionService<unknown>;

const ensureMessageEventShim = () => {
  const globalScope = globalThis as typeof globalThis & {
    MessageEvent?: new (
      type: string,
      init?: { data?: unknown; origin?: string; source?: unknown },
    ) => {
      type: string;
      data?: unknown;
      origin?: string;
      source?: unknown;
    };
  };

  if (typeof globalScope.MessageEvent === 'function') {
    return;
  }

  class RNMessageEvent {
    type: string;
    data?: unknown;
    private _origin?: string;
    private _source?: unknown;

    constructor(
      type: string,
      init?: { data?: unknown; origin?: string; source?: unknown },
    ) {
      this.type = type;
      this.data = init?.data;
      this._origin = init?.origin;
      this._source = init?.source;
    }
  }

  Object.defineProperty(RNMessageEvent.prototype, 'origin', {
    configurable: true,
    enumerable: false,
    get() {
      return this._origin;
    },
    set(value: unknown) {
      this._origin = value as string | undefined;
    },
  });

  Object.defineProperty(RNMessageEvent.prototype, 'source', {
    configurable: true,
    enumerable: false,
    get() {
      return this._source;
    },
    set(value: unknown) {
      this._source = value;
    },
  });

  globalScope.MessageEvent = RNMessageEvent as typeof globalScope.MessageEvent;
};

const getWebViewExecutionServiceCtor = (): WebViewExecutionServiceCtor => {
  ensureMessageEventShim();

  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const snapsControllersRN = require('@metamask/snaps-controllers/react-native') as {
    WebViewExecutionService?: WebViewExecutionServiceCtor;
  };

  if (!snapsControllersRN.WebViewExecutionService) {
    throw new Error(
      'Snaps react-native WebViewExecutionService is unavailable after module import.',
    );
  }

  return snapsControllersRN.WebViewExecutionService;
};

/**
 * Initialize the Snaps execution service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized controller.
 */
export const executionServiceInit: ControllerInitFunction<
  AbstractExecutionService<unknown>,
  ExecutionServiceMessenger
> = ({ controllerMessenger }) => {
  const WebViewExecutionService = getWebViewExecutionServiceCtor();

  /**
   * Set up the EIP-1193 provider for the given Snap.
   *
   * @param snapId - The ID of the Snap.
   * @param connectionStream - The stream to connect to the Snap.
   */
  const setupSnapProvider = (snapId: string, connectionStream: Duplex) => {
    Logger.log(
      '[ENGINE LOG] Engine+setupSnapProvider: Setup stream for Snap',
      snapId,
    );

    // TODO:
    // Develop a simpler getRpcMethodMiddleware object for SnapBridge.
    // Consider developing an abstract class to derived custom implementations
    // for each use case.
    const bridge = new SnapBridge({
      snapId: snapId as SnapId,
      connectionStream,
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
  };

  return {
    controller: new WebViewExecutionService({
      messenger: controllerMessenger,
      // @ts-expect-error The stream type doesn't match because of a version mismatch.
      setupSnapProvider,
      createWebView,
      removeWebView,
    }),
  };
};
