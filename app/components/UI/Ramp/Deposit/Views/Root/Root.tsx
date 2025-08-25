import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { useDepositSDK } from '../../sdk';
import GetStarted from './GetStarted/GetStarted';
import { useSelector } from 'react-redux';
import { getAllDepositOrders } from '../../../../../../reducers/fiatOrders';
import {
  FIAT_ORDER_STATES,
  FIAT_ORDER_PROVIDERS,
} from '../../../../../../constants/on-ramp';
import { createBankDetailsNavDetails } from '../BankDetails/BankDetails';
import { createEnterEmailNavDetails } from '../EnterEmail/EnterEmail';

const Root = () => {
  const navigation = useNavigation();
  const [initialRoute] = useState<string>(Routes.DEPOSIT.BUILD_QUOTE);
  const { checkExistingToken, getStarted, isAuthenticated } = useDepositSDK();
  const hasCheckedToken = useRef(false);
  const orders = useSelector(getAllDepositOrders);

  const handleRouting = useCallback(async () => {
    if (!getStarted) return;

    const createdOrder = orders.find(
      (order) =>
        order.provider === FIAT_ORDER_PROVIDERS.DEPOSIT &&
        order.state === FIAT_ORDER_STATES.CREATED,
    );

    if (createdOrder) {
      if (!isAuthenticated) {
        const [routeName, params] = createEnterEmailNavDetails({});
        navigation.reset({
          index: 0,
          routes: [
            { name: routeName, params: { ...params, animationEnabled: false } },
          ],
        });
        return;
      }

      const [routeName, params] = createBankDetailsNavDetails({
        orderId: createdOrder.id,
      });
      navigation.reset({
        index: 0,
        routes: [
          { name: routeName, params: { ...params, animationEnabled: false } },
        ],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: initialRoute, params: { animationEnabled: false } }],
      });
    }
  }, [getStarted, isAuthenticated, orders, navigation, initialRoute]);

  useEffect(() => {
    const initializeFlow = async () => {
      if (hasCheckedToken.current) return;
      await checkExistingToken();
      hasCheckedToken.current = true;
      await handleRouting();
    };
    initializeFlow();
  }, [checkExistingToken, handleRouting]);

  return <GetStarted />;
};

export default Root;
