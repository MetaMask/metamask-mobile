import { useDispatch, useSelector } from 'react-redux';
import { InteractionManager, StyleSheet, View } from 'react-native';
import React, { useCallback } from 'react';
import WebView from 'react-native-webview';
import AppConstants from '../../../core/AppConstants';
import { MetaMetricsEvents } from '../../../core/Analytics';

import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import { renderNumber } from '../../../util/number';
import { FIAT_ORDER_STATES } from '../../../constants/on-ramp';
import { NETWORKS_CHAIN_ID } from '../../../constants/network';
import {
  FiatOrder,
  getPendingOrders,
  addFiatOrder,
  updateFiatOrder,
  getCustomOrderIds,
  removeFiatCustomIdData,
  updateFiatCustomIdData,
  getAuthenticationUrls,
  removeAuthenticationUrl,
} from '../../../reducers/fiatOrders';
import useInterval from '../../hooks/useInterval';
import processOrder from './orderProcessor';
import processCustomOrderIdData from './orderProcessor/customOrderId';
import { aggregatorOrderToFiatOrder } from './orderProcessor/aggregator';
import { trackEvent } from './hooks/useAnalytics';
import { Order } from '@consensys/on-ramp-sdk';
import { AnalyticsEvents } from './types';
import { CustomIdData } from '../../../reducers/fiatOrders/types';
import { callbackBaseUrl } from '../FiatOnRampAggregator/sdk';

const POLLING_FREQUENCY = AppConstants.FIAT_ORDERS.POLLING_FREQUENCY;
const NOTIFICATION_DURATION = 5000;

export const allowedToBuy = (chainId: string) =>
  [
    NETWORKS_CHAIN_ID.MAINNET,
    NETWORKS_CHAIN_ID.OPTIMISM,
    NETWORKS_CHAIN_ID.BSC,
    NETWORKS_CHAIN_ID.POLYGON,
    NETWORKS_CHAIN_ID.FANTOM,
    NETWORKS_CHAIN_ID.ARBITRUM,
    NETWORKS_CHAIN_ID.CELO,
    NETWORKS_CHAIN_ID.AVAXCCHAIN,
    NETWORKS_CHAIN_ID.HARMONY,
  ].includes(chainId);

const baseNotificationDetails = {
  duration: NOTIFICATION_DURATION,
};

/**
 * @param {FiatOrder} fiatOrder
 */
export const getAnalyticsPayload = (fiatOrder: FiatOrder) => {
  const payload = {
    fiat_amount: { value: fiatOrder.amount, anonymous: true },
    fiat_currency: { value: fiatOrder.currency, anonymous: true },
    crypto_currency: { value: fiatOrder.cryptocurrency, anonymous: true },
    crypto_amount: { value: fiatOrder.cryptoAmount, anonymous: true },
    fee_in_fiat: { value: fiatOrder.fee, anonymous: true },
    fee_in_crypto: { value: fiatOrder.cryptoFee, anonymous: true },
    order_id: { value: fiatOrder.id, anonymous: true },
    fiat_amount_in_usd: { value: fiatOrder.amountInUSD, anonymous: true },
    'on-ramp_provider': { value: fiatOrder.provider, anonymous: true },
  };
  switch (fiatOrder.state) {
    case FIAT_ORDER_STATES.FAILED: {
      return [MetaMetricsEvents.ONRAMP_PURCHASE_FAILED_LEGACY, payload];
    }
    case FIAT_ORDER_STATES.CANCELLED: {
      return [MetaMetricsEvents.ONRAMP_PURCHASE_CANCELLED_LEGACY, payload];
    }
    case FIAT_ORDER_STATES.COMPLETED: {
      return [MetaMetricsEvents.ONRAMP_PURCHASE_COMPLETED_LEGACY, payload];
    }
    case FIAT_ORDER_STATES.PENDING:
    default: {
      return [null];
    }
  }
};
/**
 * @param {FiatOrder} fiatOrder
 */
export const getAggregatorAnalyticsPayload = (
  fiatOrder: FiatOrder,
): [
  (
    | 'ONRAMP_PURCHASE_FAILED'
    | 'ONRAMP_PURCHASE_CANCELLED'
    | 'ONRAMP_PURCHASE_COMPLETED'
    | null
  ),
  (
    | AnalyticsEvents[
        | 'ONRAMP_PURCHASE_FAILED'
        | 'ONRAMP_PURCHASE_CANCELLED'
        | 'ONRAMP_PURCHASE_COMPLETED']
    | null
  ),
] => {
  const failedOrCancelledParams = {
    currency_source: fiatOrder.currency,
    currency_destination: fiatOrder.cryptocurrency,
    chain_id_destination: fiatOrder.network,
    payment_method_id: (fiatOrder.data as Order)?.paymentMethod?.id,
    provider_onramp: (fiatOrder.data as Order)?.provider?.name,
    orderType: fiatOrder.orderType,
    amount: fiatOrder.amount as number,
  };

  const completedPayload = {
    ...failedOrCancelledParams,
    crypto_out: fiatOrder.cryptoAmount,
    total_fee: fiatOrder.fee,
    exchange_rate:
      (Number(fiatOrder.amount) - Number(fiatOrder.fee)) /
      Number(fiatOrder.cryptoAmount),
  };

  switch (fiatOrder.state) {
    case FIAT_ORDER_STATES.FAILED: {
      return ['ONRAMP_PURCHASE_FAILED', failedOrCancelledParams];
    }
    case FIAT_ORDER_STATES.CANCELLED: {
      return ['ONRAMP_PURCHASE_CANCELLED', failedOrCancelledParams];
    }
    case FIAT_ORDER_STATES.COMPLETED: {
      return ['ONRAMP_PURCHASE_COMPLETED', completedPayload];
    }
    case FIAT_ORDER_STATES.PENDING:
    default: {
      return [null, null];
    }
  }
};

/**
 * @param {FiatOrder} fiatOrder
 */
export const getNotificationDetails = (fiatOrder: FiatOrder) => {
  switch (fiatOrder.state) {
    case FIAT_ORDER_STATES.FAILED: {
      return {
        ...baseNotificationDetails,
        title: strings('fiat_on_ramp.notifications.purchase_failed_title', {
          currency: fiatOrder.cryptocurrency,
        }),
        description: strings(
          'fiat_on_ramp.notifications.purchase_failed_description',
        ),
        status: 'error',
      };
    }
    case FIAT_ORDER_STATES.CANCELLED: {
      return {
        ...baseNotificationDetails,
        title: strings('fiat_on_ramp.notifications.purchase_cancelled_title'),
        description: strings(
          'fiat_on_ramp.notifications.purchase_cancelled_description',
        ),
        status: 'cancelled',
      };
    }
    case FIAT_ORDER_STATES.COMPLETED: {
      return {
        ...baseNotificationDetails,
        title: strings('fiat_on_ramp.notifications.purchase_completed_title', {
          amount: renderNumber(String(fiatOrder.cryptoAmount)),
          currency: fiatOrder.cryptocurrency,
        }),
        description: strings(
          'fiat_on_ramp.notifications.purchase_completed_description',
          {
            currency: fiatOrder.cryptocurrency,
          },
        ),
        status: 'success',
      };
    }
    case FIAT_ORDER_STATES.PENDING:
    default: {
      return {
        ...baseNotificationDetails,
        title: strings('fiat_on_ramp.notifications.purchase_pending_title', {
          currency: fiatOrder.cryptocurrency,
        }),
        description: strings(
          'fiat_on_ramp.notifications.purchase_pending_description',
        ),
        status: 'pending',
      };
    }
  }
};

export async function processFiatOrder(
  order: FiatOrder,
  dispatchUpdateFiatOrder: (updatedOrder: FiatOrder) => void,
) {
  const updatedOrder = await processOrder(order);
  dispatchUpdateFiatOrder(updatedOrder);
  if (updatedOrder.state !== order.state) {
    const [event, params] = getAggregatorAnalyticsPayload(updatedOrder);
    if (event && params) {
      trackEvent(event, params);
    }

    InteractionManager.runAfterInteractions(() => {
      NotificationManager.showSimpleNotification(
        getNotificationDetails(updatedOrder),
      );
    });
  }
}

async function processCustomOrderId(
  customOrderIdData: CustomIdData,
  {
    dispatchUpdateFiatCustomIdData,
    dispatchRemoveFiatCustomIdData,
    dispatchAddFiatOrder,
  }: {
    dispatchUpdateFiatCustomIdData: (updatedCustomIdData: CustomIdData) => void;
    dispatchRemoveFiatCustomIdData: (customOrderIdData: CustomIdData) => void;
    dispatchAddFiatOrder: (fiatOrder: FiatOrder) => void;
  },
) {
  const [customOrderId, fiatOrderResponse] = await processCustomOrderIdData(
    customOrderIdData,
  );

  if (fiatOrderResponse) {
    const fiatOrder = aggregatorOrderToFiatOrder(fiatOrderResponse);
    dispatchAddFiatOrder(fiatOrder);
    InteractionManager.runAfterInteractions(() => {
      NotificationManager.showSimpleNotification(
        getNotificationDetails(fiatOrder),
      );
    });
    dispatchRemoveFiatCustomIdData(customOrderIdData);
  } else if (customOrderId.expired) {
    dispatchRemoveFiatCustomIdData(customOrderId);
  } else {
    dispatchUpdateFiatCustomIdData(customOrderId);
  }
}

const styles = StyleSheet.create({
  hiddenView: {
    height: 0,
    width: 0,
  },
});

function FiatOrders() {
  const dispatch = useDispatch();
  const pendingOrders = useSelector<any, FiatOrder[]>(getPendingOrders);
  const customOrderIds = useSelector<any, CustomIdData[]>(getCustomOrderIds);
  const authenticationUrls = useSelector<any, string[]>(getAuthenticationUrls);

  const dispatchAddFiatOrder = useCallback(
    (order: FiatOrder) => dispatch(addFiatOrder(order)),
    [dispatch],
  );
  const dispatchUpdateFiatOrder = useCallback(
    (order: FiatOrder) => dispatch(updateFiatOrder(order)),
    [dispatch],
  );
  const dispatchUpdateFiatCustomIdData = useCallback(
    (customIdData: CustomIdData) =>
      dispatch(updateFiatCustomIdData(customIdData)),
    [dispatch],
  );
  const dispatchRemoveFiatCustomIdData = useCallback(
    (customIdData: CustomIdData) =>
      dispatch(removeFiatCustomIdData(customIdData)),
    [dispatch],
  );

  useInterval(
    async () => {
      await Promise.all(
        pendingOrders.map((order) =>
          processFiatOrder(order, dispatchUpdateFiatOrder),
        ),
      );
    },
    pendingOrders.length ? POLLING_FREQUENCY : null,
  );

  useInterval(
    async () => {
      await Promise.all(
        customOrderIds.map((customOrderIdData) =>
          processCustomOrderId(customOrderIdData, {
            dispatchUpdateFiatCustomIdData,
            dispatchRemoveFiatCustomIdData,
            dispatchAddFiatOrder,
          }),
        ),
      );
    },
    customOrderIds.length ? POLLING_FREQUENCY : null,
  );

  const handleNavigationStateChange = useCallback(
    async (navState, authenticationUrl) => {
      if (
        navState.url.startsWith(callbackBaseUrl) &&
        navState.loading === false
      ) {
        dispatch(removeAuthenticationUrl(authenticationUrl));
      }
    },
    [dispatch],
  );

  return authenticationUrls.length > 0 ? (
    <View style={styles.hiddenView}>
      {authenticationUrls.map((url) => (
        /*
         * WebView is used to redirect to the authenticationUrl
         * but is not visible to the user
         * */
        <WebView
          key={url}
          style={styles.hiddenView}
          source={{ uri: url }}
          onNavigationStateChange={(navState) =>
            handleNavigationStateChange(navState, url)
          }
          onHttpError={() => dispatch(removeAuthenticationUrl(url))}
        />
      ))}
    </View>
  ) : null;
}

export default FiatOrders;
