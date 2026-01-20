import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { RootParamList } from '../../../../../../types/navigation';
import Routes from '../../../../../../constants/navigation/Routes';
import { useDepositSDK } from '../../sdk';
import { useSelector } from 'react-redux';
import { getAllDepositOrders } from '../../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';
import { createBankDetailsNavDetails } from '../BankDetails/BankDetails';
import { createEnterEmailNavDetails } from '../EnterEmail/EnterEmail';
import { DepositNavigationParams } from '../../types';
import { useParams } from '../../../../../../util/navigation/navUtils';

const Root = () => {
  const navigation = useNavigation();
  const params = useParams<DepositNavigationParams>();
  const [initialRoute] = useState<string>(Routes.DEPOSIT.BUILD_QUOTE);
  const { checkExistingToken, setIntent } = useDepositSDK();
  const hasCheckedToken = useRef(false);
  const orders = useSelector(getAllDepositOrders);

  useEffect(() => {
    if (params) {
      setIntent(params);
    }
  }, [params, setIntent]);

  useEffect(() => {
    const initializeFlow = async () => {
      if (hasCheckedToken.current) return;

      const isAuthenticatedFromToken = await checkExistingToken();
      hasCheckedToken.current = true;

      const createdOrder = orders.find(
        (order) => order.state === FIAT_ORDER_STATES.CREATED,
      );

      if (createdOrder) {
        if (!isAuthenticatedFromToken) {
          const [routeName, navParams] = createEnterEmailNavDetails({
            redirectToRootAfterAuth: true,
          });
          navigation.reset({
            index: 0,
            routes: [
              {
                name: routeName as keyof RootParamList,
                params: { ...navParams, animationEnabled: false },
              },
            ],
          });
          return;
        }

        const [routeName2, navParams2] = createBankDetailsNavDetails({
          orderId: createdOrder.id,
        });
        navigation.reset({
          index: 0,
          routes: [
            {
              name: routeName2 as keyof RootParamList,
              params: { ...navParams2, animationEnabled: false },
            },
          ],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: initialRoute as keyof RootParamList,
              params: { animationEnabled: false },
            },
          ],
        });
      }
    };

    initializeFlow();
  }, [checkExistingToken, orders, navigation, initialRoute]);

  return null;
};

export default Root;
