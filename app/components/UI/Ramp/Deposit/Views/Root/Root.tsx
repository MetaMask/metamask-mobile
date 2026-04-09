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
  const initializationInFlight = useRef(false);
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
      // 1. If token has already been checked, do not run again.
      if (hasCheckedToken.current) {
        return;
      }

      // 2. Single runner: effect can re-run while checkExistingToken is in flight; avoid duplicate work.
      if (initializationInFlight.current) {
        return;
      }
      initializationInFlight.current = true;

      try {
        // 3. Default until vault / SDK hydration succeeds.
        let isAuthenticatedFromToken = false;

        // 4. Attempt to restore auth from stored token; mark checked after the attempt finishes.
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
        } finally {
          hasCheckedToken.current = true;
        }

        // 5. Resume in-progress deposit order if any.
        const createdOrder = orders.find(
          (order) => order.state === FIAT_ORDER_STATES.CREATED,
        );

        // 6. Created order: require auth or continue to bank details.
        if (createdOrder) {
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
          return;
        }

        // 7. No created order: default entry (Build Quote); honor deeplink / intent flags when present.
        navigateToDefaultRoute();
      } finally {
        initializationInFlight.current = false;
      }
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
