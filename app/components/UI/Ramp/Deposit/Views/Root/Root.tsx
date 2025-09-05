import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { NavigatableRootParamList } from '../../../../../../util/navigation/types';
import { useDepositSDK } from '../../sdk';
import GetStarted from './GetStarted/GetStarted';
import { useSelector } from 'react-redux';
import { getAllDepositOrders } from '../../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';

const Root = () => {
  const navigation =
    useNavigation<
      StackNavigationProp<NavigatableRootParamList, 'DepositRoot'>
    >();
  const { checkExistingToken, getStarted } = useDepositSDK();
  const hasCheckedToken = useRef(false);
  const orders = useSelector(getAllDepositOrders);

  useEffect(() => {
    const initializeFlow = async () => {
      if (hasCheckedToken.current || !getStarted) return;

      const isAuthenticatedFromToken = await checkExistingToken();
      hasCheckedToken.current = true;

      const createdOrder = orders.find(
        (order) => order.state === FIAT_ORDER_STATES.CREATED,
      );

      if (createdOrder) {
        if (!isAuthenticatedFromToken) {
          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'EnterEmail',
                params: {
                  redirectToRootAfterAuth: true,
                  animationEnabled: false,
                },
              },
            ],
          });
          return;
        }

        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'BankDetails',
              params: { orderId: createdOrder.id, animationEnabled: false },
            },
          ],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'BuildQuote', params: { animationEnabled: false } }],
        });
      }
    };

    initializeFlow();
  }, [checkExistingToken, getStarted, orders, navigation]);

  return <GetStarted />;
};

export default Root;
