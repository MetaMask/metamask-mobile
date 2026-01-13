import { AbstractExecutionService } from '@metamask/snaps-controllers';
// eslint-disable-next-line import/no-nodejs-modules
import { Duplex } from 'stream';
import { ControllerInitFunction } from '../../types';
import { ExecutionServiceMessenger } from '../../messengers/snaps';
import { WebViewExecutionService } from '@metamask/snaps-controllers/react-native';
import { createWebView, removeWebView } from '../../../../lib/snaps';
import Logger from '../../../../util/Logger';
import { SnapBridge } from '../../../Snaps';
import getRpcMethodMiddleware from '../../../RPCMethods/RPCMethodMiddleware';
import { SnapId } from '@metamask/snaps-sdk';

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
          isHomepage: () => false,
          fromHomepage: { current: false },
          toggleUrlModal: () => null,
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

  return {
    controller: new WebViewExecutionService({
      messenger: controllerMessenger,
      setupSnapProvider,
      createWebView,
      removeWebView,
    }),
  };
};
