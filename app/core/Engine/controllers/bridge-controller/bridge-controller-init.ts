import {
  BridgeClientId,
  BridgeController,
  BridgeControllerMessenger,
} from '@metamask/bridge-controller';
import { fetch as expoFetch } from 'expo/fetch';

import { ControllerInitFunction, ControllerInitRequest } from '../../types';
import { MetaMetrics } from '../../../Analytics';
import { TransactionParams } from '@metamask/transaction-controller';
import {
  ChainId,
  handleFetch,
  TraceCallback,
} from '@metamask/controller-utils';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import { MetricsEventBuilder } from '../../../Analytics/MetricsEventBuilder';
import { trace } from '../../../../util/trace';
import Logger from '../../../../util/Logger';
import packageJSON from '../../../../../package.json';

const { version: clientVersion } = packageJSON;

export const handleBridgeFetch = async (
  url: RequestInfo | URL,
  options: RequestInit = {},
) => {
  if (url.toString().includes('Stream')) {
    // @ts-expect-error - expoFetch has a different RequestInit type
    return expoFetch(url.toString(), options);
  }
  return handleFetch(url, options);
};

export const bridgeControllerInit: ControllerInitFunction<
  BridgeController,
  BridgeControllerMessenger
> = (request) => {
  const { controllerMessenger } = request;
  const { transactionController } = getControllers(request);

  try {
    /* bridge controller Initialization */
    const bridgeController = new BridgeController({
      messenger: controllerMessenger,
      clientId: BridgeClientId.MOBILE,
      clientVersion,
      // TODO: change getLayer1GasFee type to match transactionController.getLayer1GasFee
      getLayer1GasFee: async ({
        transactionParams,
        chainId,
      }: {
        transactionParams: TransactionParams;
        chainId: ChainId;
      }) =>
        transactionController.getLayer1GasFee({
          transactionParams,
          chainId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
      fetchFn: handleBridgeFetch,
      config: {
        customBridgeApiBaseUrl: BRIDGE_API_BASE_URL,
      },
      trackMetaMetricsFn: (event, properties) => {
        const metricsEvent = MetricsEventBuilder.createEventBuilder({
          // category property here maps to event name
          category: event,
        })
          .addProperties({
            ...(properties ?? {}),
          })
          .build();
        MetaMetrics.getInstance().trackEvent(metricsEvent);
      },
      traceFn: trace as TraceCallback,
    });

    return { controller: bridgeController };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize BridgeController');
    throw error;
  }
};

function getControllers(
  request: ControllerInitRequest<BridgeControllerMessenger>,
) {
  return {
    transactionController: request.getController('TransactionController'),
  };
}
