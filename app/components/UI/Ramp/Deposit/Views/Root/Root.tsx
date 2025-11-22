import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { useDepositSDK } from '../../sdk';
import GetStarted from './GetStarted/GetStarted';
import { useSelector } from 'react-redux';
import { getAllDepositOrders } from '../../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';
import { createBankDetailsNavDetails } from '../BankDetails/BankDetails';
import { createEnterEmailNavDetails } from '../EnterEmail/EnterEmail';

const Root = () => {
  const navigation = useNavigation();
  const [initialRoute] = useState<string>(Routes.DEPOSIT.BUILD_QUOTE);
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
          const [routeName, params] = createEnterEmailNavDetails({
            redirectToRootAfterAuth: true,
          });
          navigation.reset({
            index: 0,
            routes: [
              {
                name: routeName,
                params: { ...params, animationEnabled: false },
              },
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
    };

    initializeFlow();
  }, [checkExistingToken, getStarted, orders, navigation, initialRoute]);

  return <GetStarted />;
};

export default Root;
