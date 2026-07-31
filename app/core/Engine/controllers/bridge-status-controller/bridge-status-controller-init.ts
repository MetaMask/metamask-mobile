import { BridgeClientId } from '@metamask/bridge-controller';
import {
  BridgeStatusController,
  BridgeStatusControllerMessenger,
  QuoteStatusGetError,
  QuoteStatusUpdateError,
} from '@metamask/bridge-status-controller';
import { handleFetch, TraceCallback } from '@metamask/controller-utils';
import { captureException } from '@sentry/react-native';

import {
  MessengerClientInitFunction,
  MessengerClientInitRequest,
} from '../../types';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import { trace } from '../../../../util/trace';
import Logger from '../../../../util/Logger';

/**
 * Shape of the `bridgeQuoteStatusManager` remote feature flag after it has been resolved by
 * `RemoteFeatureFlagController`. The controller processes the raw
 * version-scoped format (`{ versions: { "11.0.0": { enabled: true } } }`)
 * and stores only the matching version's value, so the UI receives a flat
 * `{ enabled: boolean }` object.
 */
interface BridgeQuoteStatusManagerFeatureFlag {
  enabled?: boolean;
}

export const bridgeStatusControllerInit: MessengerClientInitFunction<
  BridgeStatusController,
  BridgeStatusControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;
  const { transactionController, remoteFeatureFlagController } =
    getControllers(request);

  try {
    /* bridge status controller Initialization */
    const bridgeStatusController = new BridgeStatusController({
      messenger: controllerMessenger,
      state: persistedState.BridgeStatusController,
      clientId: BridgeClientId.MOBILE,
      clientProduct: 'metamask-mobile',
      fetchFn: handleFetch,
      addTransactionBatchFn: (
        ...args: Parameters<typeof transactionController.addTransactionBatch>
      ) => transactionController.addTransactionBatch(...args),
      traceFn: trace as TraceCallback,
      config: {
        customBridgeApiBaseUrl: BRIDGE_API_BASE_URL,
      },
      onQuoteStatusManagerError: (
        error: QuoteStatusUpdateError | QuoteStatusGetError,
      ) => {
        if (error instanceof QuoteStatusUpdateError) {
          captureException(error);
        }
      },
      isQuoteStatusManagerEnabled: () => {
        const { remoteFeatureFlags, localOverrides } =
          remoteFeatureFlagController.state;
        const flags = {
          ...remoteFeatureFlags,
          ...(localOverrides ?? {}),
        };
        const bridgeQuoteStatusManager = flags.bridgeQuoteStatusManager as
          | BridgeQuoteStatusManagerFeatureFlag
          | undefined;
        return bridgeQuoteStatusManager?.enabled === true;
      },
    });

    return { controller: bridgeStatusController };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize BridgeStatusController');
    throw error;
  }
};

function getControllers(
  request: MessengerClientInitRequest<BridgeStatusControllerMessenger>,
) {
  return {
    transactionController: request.getMessengerClient('TransactionController'),
    remoteFeatureFlagController: request.getMessengerClient(
      'RemoteFeatureFlagController',
    ),
  };
}
