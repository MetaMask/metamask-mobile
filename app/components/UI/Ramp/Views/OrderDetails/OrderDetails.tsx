import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { ScrollView } from 'react-native-gesture-handler';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  FontWeight,
} from '@metamask/design-system-react-native';
import type { RampsOrder } from '@metamask/ramps-controller';
import { RampsOrderStatus } from '@metamask/ramps-controller';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { strings } from '../../../../../../locales/i18n';
import { getRampsOrderDetailsNavbarOptions } from '../../../Navbar';
import Routes from '../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { useTheme } from '../../../../../util/theme';
import Logger from '../../../../../util/Logger';
import OrderContent from './OrderContent';
import { useRampsOrders } from '../../hooks/useRampsOrders';
import {
  getOrderById as getReduxOrderById,
} from '../../../../../reducers/fiatOrders';
import { RootState } from '../../../../../reducers';

interface RampsOrderDetailsParams {
  orderId: string;
  showCloseButton?: boolean;
}

export const createRampsOrderDetailsNavDetails =
  createNavigationDetails<RampsOrderDetailsParams>(
    Routes.RAMP.RAMPS_ORDER_DETAILS,
  );

const PENDING_STATUSES = new Set([
  RampsOrderStatus.Pending,
  RampsOrderStatus.Created,
  RampsOrderStatus.Precreated,
  RampsOrderStatus.Unknown,
]);

const OrderDetails = () => {
  const params = useParams<RampsOrderDetailsParams>();
  const { getOrderById, refreshOrder, orders } = useRampsOrders();
  const controllerOrder = getOrderById(params.orderId);

  const reduxOrder = useSelector((state: RootState) =>
    getReduxOrderById(state, params.orderId),
  );

  const order: RampsOrder | undefined = useMemo(() => {
    if (controllerOrder) return controllerOrder;
    if (!reduxOrder) return undefined;
    return reduxOrder.data as RampsOrder;
  }, [controllerOrder, reduxOrder]);

  const isPending = order ? PENDING_STATUSES.has(order.status) : false;

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9c6c8903-8f2d-4d08-852b-4db8f67a5027',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'201c43'},body:JSON.stringify({sessionId:'201c43',location:'OrderDetails.tsx:65',message:'OrderDetails mount',data:{orderId:params.orderId,controllerOrderFound:!!controllerOrder,reduxOrderFound:!!reduxOrder,resolvedOrderFound:!!order,orderCount:orders.length},timestamp:Date.now(),hypothesisId:'A-B'})}).catch(()=>{});
  // #endregion

  const [isLoading, setIsLoading] = useState(isPending);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const { colors } = theme;
  const navigation = useNavigation();

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions(
      getRampsOrderDetailsNavbarOptions(
        navigation,
        { title: strings('ramps_order_details.title') },
        theme,
      ),
    );
  }, [theme, navigation]);

  const handleOnRefresh = useCallback(async () => {
    if (!order) return;
    try {
      setError(null);
      setIsRefreshing(true);
      const providerCode = (order.provider?.id ?? '').replace(
        '/providers/',
        '',
      );
      await refreshOrder(
        providerCode,
        order.providerOrderId,
        order.walletAddress,
      );
    } catch (fetchError) {
      Logger.error(fetchError as Error, {
        message: 'FiatOrders::RampsOrderDetails error while refreshing order',
      });
      setError(
        fetchError instanceof Error && fetchError.message
          ? fetchError.message
          : strings('ramps_order_details.error_message'),
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [order, refreshOrder]);

  useEffect(() => {
    if (isPending) {
      handleOnRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <Box twClassName="flex-1 items-center justify-center px-16 py-16">
            <Icon
              name={IconName.Danger}
              size={IconSize.Xl}
              twClassName="text-error-default mb-2"
            />
            <Text
              variant={TextVariant.HeadingSm}
              fontWeight={FontWeight.Bold}
              twClassName="text-center mb-2"
            >
              {strings('ramps_order_details.error_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-alternative text-center mb-8"
            >
              {error}
            </Text>
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('ramps_order_details.try_again')}
              onPress={handleOnRefresh}
            />
          </Box>
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
            <OrderContent
              order={order}
              showCloseButton={params.showCloseButton}
            />
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScrollView>
    </ScreenLayout>
  );
};

export default OrderDetails;
