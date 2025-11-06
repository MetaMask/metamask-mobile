import React, { useCallback } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import WebView, { WebViewNavigation } from '@metamask/react-native-webview';
import AppConstants from '../../../core/AppConstants';
import NotificationManager from '../../../core/NotificationManager';
import {
  FiatOrder,
  getPendingOrders,
  getForceUpdateOrders,
  addFiatOrder,
  updateFiatOrder,
  getCustomOrderIds,
  removeFiatCustomIdData,
  updateFiatCustomIdData,
  getAuthenticationUrls,
  removeAuthenticationUrl,
  getOrderById,
} from '../../../reducers/fiatOrders';
import useInterval from '../../hooks/useInterval';
import useThunkDispatch, { ThunkAction } from '../../hooks/useThunkDispatch';
import processOrder from './orderProcessor';
import processCustomOrderIdData from './Aggregator/orderProcessor/customOrderId';
import { aggregatorOrderToFiatOrder } from './Aggregator/orderProcessor/aggregator';
import { trackEvent } from './hooks/useAnalytics';
import { CustomIdData } from '../../../reducers/fiatOrders/types';
import { callbackBaseUrl } from './Aggregator/sdk';
import useFetchRampNetworks from './Aggregator/hooks/useFetchRampNetworks';
import getNotificationDetails from './utils/getNotificationDetails';
import stateHasOrder from './utils/stateHasOrder';
import Routes from '../../../constants/navigation/Routes';
import getOrderAnalyticsPayload from './utils/getOrderAnalyticsPayload';
import { NativeRampsSdk } from '@consensys/native-ramps-sdk';

const POLLING_FREQUENCY = AppConstants.FIAT_ORDERS.POLLING_FREQUENCY;

export interface ProcessorOptions {
  forced?: boolean;
  sdk?: NativeRampsSdk;
}

export async function processFiatOrder(
  order: FiatOrder,
  dispatchUpdateFiatOrder: (updatedOrder: FiatOrder) => void,
  dispatchThunk: (thunk: ThunkAction) => void,
  options?: ProcessorOptions,
) {
  const updatedOrder = await processOrder(order, options);
  dispatchThunk((_dispatch, getState) => {
    const state = getState();
    const existingOrder = getOrderById(state, updatedOrder.id);
    if (existingOrder?.state !== updatedOrder.state) {
      const [event, params] = getOrderAnalyticsPayload(updatedOrder, state);
      if (event && params) {
        trackEvent(event, params);
      }
      InteractionManager.runAfterInteractions(() => {
        const notificationDetails = getNotificationDetails(updatedOrder);
        if (notificationDetails) {
          NotificationManager.showSimpleNotification(notificationDetails);
        }
      });
    }
    dispatchUpdateFiatOrder(updatedOrder);
  });
}

async function processCustomOrderId(
  customOrderIdData: CustomIdData,
  {
    dispatchUpdateFiatCustomIdData,
    dispatchRemoveFiatCustomIdData,
    dispatchAddFiatOrder,
    dispatchThunk,
  }: {
    dispatchUpdateFiatCustomIdData: (updatedCustomIdData: CustomIdData) => void;
    dispatchRemoveFiatCustomIdData: (customOrderIdData: CustomIdData) => void;
    dispatchAddFiatOrder: (fiatOrder: FiatOrder) => void;
    dispatchThunk: (thunk: ThunkAction) => void;
  },
) {
  const [customOrderId, fiatOrderResponse] = await processCustomOrderIdData(
    customOrderIdData,
  );

  if (fiatOrderResponse) {
    const fiatOrder = aggregatorOrderToFiatOrder(fiatOrderResponse);
    dispatchThunk((_, getState) => {
      const state = getState();
      if (stateHasOrder(state, fiatOrder)) {
        return;
      }
      dispatchAddFiatOrder(fiatOrder);
      InteractionManager.runAfterInteractions(() => {
        const notificationDetails = getNotificationDetails(fiatOrder);
        if (notificationDetails) {
          NotificationManager.showSimpleNotification(notificationDetails);
        }
      });
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
  useFetchRampNetworks();
  const dispatch = useDispatch();
  const dispatchThunk = useThunkDispatch();
  const navigation = useNavigation();
  const pendingOrders = useSelector(getPendingOrders);
  const forceUpdateOrders = useSelector(getForceUpdateOrders);
  const customOrderIds = useSelector(getCustomOrderIds);
  const authenticationUrls = useSelector(getAuthenticationUrls);

  const dispatchAddFiatOrder = useCallback(
    (order: FiatOrder) => {
      dispatchThunk((_dispatch, getState) => {
        const state = getState();
        if (stateHasOrder(state, order)) {
          return;
        }
        _dispatch(addFiatOrder(order));
        if (order.orderType === OrderOrderTypeEnum.Sell) {
          navigation.navigate(Routes.TRANSACTIONS_VIEW, {
            screen: Routes.RAMP.ORDER_DETAILS,
            initial: false,
            params: {
              orderId: order.id,
              redirectToSendTransaction: true,
            },
          });
        }
      });
    },
    [dispatchThunk, navigation],
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
          processFiatOrder(order, dispatchUpdateFiatOrder, dispatchThunk),
        ),
      );
    },
    { delay: pendingOrders.length ? POLLING_FREQUENCY : null, immediate: true },
  );

  useInterval(
    async () => {
      await Promise.all(
        customOrderIds.map((customOrderIdData) =>
          processCustomOrderId(customOrderIdData, {
            dispatchUpdateFiatCustomIdData,
            dispatchRemoveFiatCustomIdData,
            dispatchAddFiatOrder,
            dispatchThunk,
          }),
        ),
      );
    },
    {
      delay: customOrderIds.length ? POLLING_FREQUENCY : null,
      immediate: true,
    },
  );

  useInterval(
    async () => {
      await Promise.all(
        forceUpdateOrders.map((order) =>
          processFiatOrder(order, dispatchUpdateFiatOrder, dispatchThunk),
        ),
      );
    },
    {
      delay: forceUpdateOrders.length ? POLLING_FREQUENCY : null,
      immediate: true,
    },
  );

  const handleNavigationStateChange = useCallback(
    async (navState: WebViewNavigation, authenticationUrl: string) => {
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
          onNavigationStateChange={(navState: WebViewNavigation) =>
            handleNavigationStateChange(navState, url)
          }
          onHttpError={() => dispatch(removeAuthenticationUrl(url))}
        />
      ))}
    </View>
  ) : null;
}

export default FiatOrders;
