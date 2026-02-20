import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { useDepositSDK } from '../../sdk';
import { useSelector } from 'react-redux';
import { getAllDepositOrders } from '../../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';
import { createBankDetailsNavDetails } from '../BankDetails/BankDetails';
import { createEnterEmailNavDetails } from '../EnterEmail/EnterEmail';
import { DepositNavigationParams } from '../../types';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { useTheme } from '../../../../../../util/theme';
import Logger from '../../../../../../util/Logger';

export const TOKEN_CHECK_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Operation timed out after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timeoutId),
  );
}

const Root = () => {
  const navigation = useNavigation();
  const params = useParams<DepositNavigationParams>();
  const [initialRoute] = useState<string>(Routes.DEPOSIT.BUILD_QUOTE);
  const { checkExistingToken, setIntent } = useDepositSDK();
  const hasCheckedToken = useRef(false);
  const orders = useSelector(getAllDepositOrders);
  const theme = useTheme();

  useEffect(() => {
    if (params) {
      setIntent(params);
    }
  }, [params, setIntent]);

  useEffect(() => {
    const navigateToDefaultRoute = () => {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: initialRoute,
            params: {
              animationEnabled: false,
              ...(params?.shouldRouteImmediately && {
                shouldRouteImmediately: true,
              }),
              ...(params?.amount !== undefined && { amount: params.amount }),
            },
          },
        ],
      });
    };

    const initializeFlow = async () => {
      if (hasCheckedToken.current) return;
      hasCheckedToken.current = true;

      const createdOrder = orders.find(
        (order) => order.state === FIAT_ORDER_STATES.CREATED,
      );

      if (!createdOrder) {
        navigateToDefaultRoute();
        return;
      }

      let isAuthenticatedFromToken = false;
      try {
        isAuthenticatedFromToken = await withTimeout(
          checkExistingToken(),
          TOKEN_CHECK_TIMEOUT_MS,
        );
      } catch (error) {
        Logger.error(
          error as Error,
          'Deposit Root: checkExistingToken failed or timed out',
        );
      }

      if (!isAuthenticatedFromToken) {
        const [routeName, navParams] = createEnterEmailNavDetails({
          redirectToRootAfterAuth: true,
        });
        navigation.reset({
          index: 0,
          routes: [
            {
              name: routeName,
              params: { ...navParams, animationEnabled: false },
            },
          ],
        });
        return;
      }

      const [routeName, navParams] = createBankDetailsNavDetails({
        orderId: createdOrder.id,
      });
      navigation.reset({
        index: 0,
        routes: [
          {
            name: routeName,
            params: { ...navParams, animationEnabled: false },
          },
        ],
      });
    };

    initializeFlow().catch((error) => {
      Logger.error(
        error as Error,
        'Deposit Root: initializeFlow failed unexpectedly',
      );
      navigateToDefaultRoute();
    });
  }, [
    checkExistingToken,
    orders,
    navigation,
    initialRoute,
    params?.shouldRouteImmediately,
    params?.amount,
  ]);

  return (
    <Box twClassName="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color={theme.colors.primary.default} />
    </Box>
  );
};

export default Root;
