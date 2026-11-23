import {
  BridgeClientId,
  BridgeController,
  BridgeControllerMessenger,
} from '@metamask/bridge-controller';
import { fetch as rawExpoFetch } from 'expo/fetch';
import { tempDevDashWrapFetch } from '../../../TempDevDash'; // DevDash hook

import {
  MessengerClientInitFunction,
  MessengerClientInitRequest,
} from '../../types';
import type { BridgeControllerInitMessenger } from '../../messengers/bridge-controller-messenger';
import { TransactionParams } from '@metamask/transaction-controller';
import { buildAndTrackEvent } from '../../utils/analytics';
import type { AnalyticsUnfilteredProperties } from '../../../../util/analytics/analytics.types';
import { ChainId, handleFetch } from '@metamask/controller-utils';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import { trace } from '../../../../util/trace';
import Logger from '../../../../util/Logger';
import ReduxService from '../../../redux';
import {
  FirstQuoteAbTestVariant,
  IMMEDIATE_FIRST_QUOTE_FETCH_AB_KEY,
  YIELD_AFTER_FIRST_QUOTE_AB_KEY,
  selectFirstQuoteAbTestVariant,
} from '../../../../components/UI/Bridge/utils/firstQuoteFlushAbTestConfig';
import packageJSON from '../../../../../package.json';

const { version: clientVersion } = packageJSON;
const expoFetch = tempDevDashWrapFetch(rawExpoFetch); // DevDash hook

export const handleBridgeFetch = async (
  url: RequestInfo | URL,
  options: RequestInit = {},
) => {
  const urlString = url.toString();

  if (urlString.includes('Stream')) {
    return expoFetch(urlString, options);
  }

  if (urlString.includes('/obtainGaslessBatch')) {
    return fetch(urlString, options);
  }

  return handleFetch(url, options);
};

export const bridgeControllerInit: MessengerClientInitFunction<
  BridgeController,
  BridgeControllerMessenger,
  BridgeControllerInitMessenger
> = (request) => {
  const { controllerMessenger, initMessenger } = request;
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
        buildAndTrackEvent(
          initMessenger,
          event,
          properties as AnalyticsUnfilteredProperties,
        );
      },
      traceFn: trace,
      // AssetsController is now the sole source of truth for asset rates
      // (the legacy TokenRatesController/CurrencyRateController have been
      // removed).
      getUseAssetsControllerForRates: () => true,
      getShouldFetchFirstQuoteImmediately: () =>
        selectFirstQuoteAbTestVariant(
          ReduxService.store.getState(),
          IMMEDIATE_FIRST_QUOTE_FETCH_AB_KEY,
        ) === FirstQuoteAbTestVariant.Treatment,
      getShouldYieldAfterFirstQuote: () =>
        selectFirstQuoteAbTestVariant(
          ReduxService.store.getState(),
          YIELD_AFTER_FIRST_QUOTE_AB_KEY,
        ) === FirstQuoteAbTestVariant.Treatment,
    });

    return { controller: bridgeController };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize BridgeController');
    throw error;
  }
};

function getControllers(
  request: MessengerClientInitRequest<
    BridgeControllerMessenger,
    BridgeControllerInitMessenger
  >,
) {
  return {
    transactionController: request.getMessengerClient('TransactionController'),
  };
}
