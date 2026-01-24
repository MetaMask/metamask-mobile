import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { ScrollView } from 'react-native-gesture-handler';
import useThunkDispatch from '../../../../../hooks/useThunkDispatch';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import {
  FiatOrder,
  getOrderById,
  updateFiatOrder,
} from '../../../../../../reducers/fiatOrders';
import { strings } from '../../../../../../../locales/i18n';
import { getDepositNavbarOptions } from '../../../../Navbar';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import { useTheme } from '../../../../../../util/theme';
import Logger from '../../../../../../util/Logger';
import { RootState } from '../../../../../../reducers';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';
import ErrorView from '../../components/ErrorView';
import useInterval from '../../../../../hooks/useInterval';
import AppConstants from '../../../../../../core/AppConstants';
import DepositOrderContent from '../../components/DepositOrderContent/DepositOrderContent';
import { processFiatOrder } from '../../../index';

interface DepositOrderDetailsParams {
  orderId: string;
}

export const createDepositOrderDetailsNavDetails =
  createNavigationDetails<DepositOrderDetailsParams>(
    Routes.DEPOSIT.ORDER_DETAILS,
  );

const DepositOrderDetails = () => {
  const params = useParams<DepositOrderDetailsParams>();
  const order = useSelector((state: RootState) =>
    getOrderById(state, params.orderId),
  );
  const [isLoading, setIsLoading] = useState(
    order?.state === FIAT_ORDER_STATES.CREATED,
  );
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const dispatchThunk = useThunkDispatch();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingInterval, setIsRefreshingInterval] = useState(false);

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        {
          title: strings('deposit.order_details.title'),
        },
        theme,
      ),
    );
  }, [theme, navigation]);

  const dispatchUpdateFiatOrder = useCallback(
    (updatedOrder: FiatOrder) => dispatch(updateFiatOrder(updatedOrder)),
    [dispatch],
  );

  const handleOnRefresh = useCallback(
    async ({ fromInterval }: { fromInterval?: boolean } = {}) => {
      if (!order) return;
      try {
        setError(null);
        if (fromInterval) {
          setIsRefreshingInterval(true);
        } else {
          setIsRefreshing(true);
        }
        await processFiatOrder(order, dispatchUpdateFiatOrder, dispatchThunk, {
          forced: true,
        });
      } catch (fetchError) {
        Logger.error(fetchError as Error, {
          message:
            'FiatOrders::DepositOrderDetails error while processing order',
          order,
        });
        setError(
          fetchError instanceof Error && fetchError.message
            ? fetchError.message
            : strings('deposit.order_details.error_message'),
        );
      } finally {
        if (fromInterval) {
          setIsRefreshingInterval(false);
        } else {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [dispatchThunk, dispatchUpdateFiatOrder, order],
  );

  useEffect(() => {
    if (order?.state === FIAT_ORDER_STATES.CREATED) {
      handleOnRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useInterval(() => handleOnRefresh({ fromInterval: true }), {
    delay:
      !isLoading &&
      !isRefreshingInterval &&
      order &&
      order.state === FIAT_ORDER_STATES.CREATED
        ? AppConstants.FIAT_ORDERS.POLLING_FREQUENCY
        : null,
  });

  if (!order) {
    return <ScreenLayout />;
  }

  if (isLoading) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <ActivityIndicator />
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            title={strings('deposit.order_details.error_title')}
            description={error}
            ctaOnPress={handleOnRefresh}
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScrollView
        refreshControl={
          <RefreshControl
            colors={[colors.primary.default]}
            tintColor={colors.icon.default}
            refreshing={isRefreshing}
            onRefresh={handleOnRefresh}
          />
        }
      >
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <DepositOrderContent order={order} />
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScrollView>
    </ScreenLayout>
  );
};

export default DepositOrderDetails;
