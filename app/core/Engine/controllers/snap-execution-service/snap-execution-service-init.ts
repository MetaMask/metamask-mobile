import {
  AbstractExecutionService,
  ExecutionServiceMessenger,
} from '@metamask/snaps-controllers';
import { WebViewExecutionService } from '@metamask/snaps-controllers/dist/services/webview/WebViewExecutionService.cjs';
import { ControllerInitFunction } from '../../types';
import { SnapBridge } from '../../../Snaps';
import getRpcMethodMiddleware from '../../../RPCMethods/RPCMethodMiddleware';
import { Duplex } from 'stream';
import { createWebView, removeWebView } from '../../../../lib/snaps';

/**
 * Initialize the Snaps execution service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @param request.offscreenPromise - The promise that resolves when the
import { ControllerInitFunction } from '../../types';
 * offscreen document is ready.
 * @param request.setupUntrustedCommunicationEip1193 - The setup function for
 * EIP-1193 communication.
 * @returns The initialized controller.
 */
export const ExecutionServiceInit: ControllerInitFunction<
  AbstractExecutionService<unknown>,
  ExecutionServiceMessenger
> = (request) => {
  const { controllerMessenger } = request;

  const setupSnapProvider = (snapId: string, connectionStream: Duplex) => {
    Logger.log(
      '[ENGINE LOG] Engine+setupSnapProvider: Setup stream for Snap',
      snapId,
    );
    // TO DO:
    // Develop a simpler getRpcMethodMiddleware object for SnapBridge
    // Consider developing an abstract class to derived custom implementations for each use case
    const bridge = new SnapBridge({
      snapId,
      connectionStream,
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
          wizardScrollAdjusted: { current: false },
          tabId: false,
          isWalletConnect: true,
          isMMSDK: false,
          url: { current: '' },
          analytics: {},
          injectHomePageScripts: () => null,
        }),
    });

    bridge.setupProviderConnection();
  };

  /**
   * Set up the EIP-1193 provider for the given Snap.
   *
   * @param snapId - The ID of the Snap.
   * @param connectionStream - The stream to connect to the Snap.
   */
  //   function setupSnapProvider(snapId: string, connectionStream: Duplex) {
  //     setupUntrustedCommunicationEip1193({
  //       connectionStream,
  //       sender: { snapId },
  //       subjectType: SubjectType.Snap,
  //     });
  //   }

  //   if (useOffscreenDocument) {
  //     return {
  //       memStateKey: null,
  //       persistedStateKey: null,
  //       controller: new OffscreenExecutionService({
  //         messenger: controllerMessenger,
  //         setupSnapProvider,
  //         offscreenPromise,
  //       }),
  //     };
  //   }

  //   const iframeUrl = process.env.IFRAME_EXECUTION_ENVIRONMENT_URL;
  //   assert(iframeUrl, 'Missing iframe URL.');
  return new WebViewExecutionService({
    messenger: controllerMessenger,
    setupSnapProvider: setupSnapProvider.bind(this),
    createWebView,
    removeWebView,
  });
};
