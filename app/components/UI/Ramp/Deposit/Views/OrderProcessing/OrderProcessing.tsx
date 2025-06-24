import React, { useCallback, useEffect } from 'react';
import { View, TouchableOpacity, Image, Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSelector } from 'react-redux';
import styleSheet from './OrderProcessing.styles';
import { useNavigation } from '@react-navigation/native';
import StyledButton from '../../../../StyledButton';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../../component-library/hooks';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../Navbar';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { getOrderById } from '../../../../../../reducers/fiatOrders';
import { RootState } from '../../../../../../reducers';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';

import { strings } from '../../../../../../../locales/i18n';
import { formatCurrency, getCryptoCurrencyFromTransakId } from '../../utils';
import { selectChainId } from '../../../../../../selectors/networkController';
import { selectEvmNetworkName } from '../../../../../../selectors/networkInfos';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';
import { DepositOrder } from '@consensys/native-ramps-sdk';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { useAccountName } from '../../../../../hooks/useAccountName';
import Avatar, {
  AvatarAccountType,
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import Loader from '../../../../../../component-library/components-temp/Loader/Loader';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';

enum OrderStatus {
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface OrderProcessingParams {
  orderId: string;
}

export const createOrderProcessingNavDetails =
  createNavigationDetails<OrderProcessingParams>(
    Routes.DEPOSIT.ORDER_PROCESSING,
  );

const OrderProcessing = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { orderId } = useParams<OrderProcessingParams>();

  const order = useSelector((state: RootState) => getOrderById(state, orderId));
  const chainId = useSelector(selectChainId);
  const networkName = useSelector(selectEvmNetworkName);
  const accountName = useAccountName();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const accountAvatarType = useSelector((state: RootState) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const isDepositOrder = useCallback(
    (data: unknown): data is DepositOrder =>
      data !== null && typeof data === 'object',
    [],
  );

  const getCryptoToken = () => {
    if (!isDepositOrder(order?.data)) {
      return null;
    }

    return getCryptoCurrencyFromTransakId(order.data.cryptoCurrency);
  };
  const cryptoToken = getCryptoToken();

  const getOrderState = () => {
    if (order?.state === FIAT_ORDER_STATES.COMPLETED) {
      return OrderStatus.SUCCESS;
    } else if (
      order?.state === FIAT_ORDER_STATES.CANCELLED ||
      order?.state === FIAT_ORDER_STATES.FAILED
    ) {
      return OrderStatus.ERROR;
    }
    return OrderStatus.PROCESSING;
  };
  const orderState = getOrderState();

  const getIconContainerStyle = () => {
    switch (orderState) {
      case OrderStatus.SUCCESS:
        return styles.successIconContainer;
      case OrderStatus.ERROR:
        return styles.errorIconContainer;
      case OrderStatus.PROCESSING:
      default:
        return styles.processingIconContainer;
    }
  };

  const handleCopyOrderId = useCallback(() => {
    if (order?.id) {
      Clipboard.setString(order.id);
    }
  }, [order?.id]);

  const handleMainAction = useCallback(() => {
    if (orderState === OrderStatus.ERROR) {
      navigation.navigate(Routes.DEPOSIT.BUILD_QUOTE);
    } else {
      navigation.navigate(Routes.WALLET.HOME);
    }
  }, [orderState, navigation]);

  const handleContactSupport = useCallback(() => {
    // TODO: Discuss proper support feature
    Linking.openURL('https://support.transak.com/');
  }, []);

  const handleViewInTransak = useCallback(() => {
    if (isDepositOrder(order?.data) && order.data.providerOrderLink) {
      Linking.openURL(order.data.providerOrderLink);
    }
  }, [order?.data, isDepositOrder]);

  useEffect(() => {
    const title =
      orderState === OrderStatus.SUCCESS
        ? strings('deposit.order_processing.success_title')
        : orderState === OrderStatus.ERROR
        ? strings('deposit.order_processing.error_title')
        : strings('deposit.order_processing.title');

    navigation.setOptions(
      getDepositNavbarOptions(navigation, { title }, theme),
    );
  }, [navigation, theme, orderState]);

  if (!order) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content grow>
            <View style={styles.errorContainer}>
              <Text variant={TextVariant.BodyMD}>
                {strings('deposit.order_processing.no_order_found')}
              </Text>
            </View>
          </ScreenLayout.Content>
        </ScreenLayout.Body>
        <ScreenLayout.Footer>
          <ScreenLayout.Content>
            <View style={styles.buttonContainer}>
              <StyledButton
                type="confirm"
                onPress={() => navigation.navigate(Routes.WALLET.HOME)}
                testID="no-order-back-button"
              >
                {strings('deposit.order_processing.back_to_wallet')}
              </StyledButton>
            </View>
          </ScreenLayout.Content>
        </ScreenLayout.Footer>
      </ScreenLayout>
    );
  }

  const shortOrderId = order.id.slice(-6);
  const totalAmount =
    order.amount && order.fee
      ? (
          parseFloat(order.amount.toString()) + parseFloat(order.fee.toString())
        ).toString()
      : order.amount;

  const orderFee = formatCurrency(
    order.fee || order.cryptoFee || 0,
    order.currency,
  );

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content style={styles.content}>
          <View style={styles.mainSection}>
            <View style={styles.iconRow}>
              <View style={getIconContainerStyle()}>
                {orderState === OrderStatus.PROCESSING ? (
                  <Loader size="large" color={theme.colors.primary.default} />
                ) : orderState === OrderStatus.SUCCESS ? (
                  <Icon
                    name={IconName.CheckBold}
                    size={IconSize.Xl}
                    color={IconColor.Success}
                  />
                ) : (
                  <Icon
                    name={IconName.Close}
                    size={IconSize.Xl}
                    color={IconColor.Error}
                  />
                )}
              </View>
              {cryptoToken && (
                <Image
                  source={{ uri: cryptoToken.logo }}
                  style={styles.cryptoIcon}
                />
              )}
            </View>

            <Text variant={TextVariant.DisplayMD} style={styles.mainAmount}>
              {order.cryptoAmount} {order.cryptocurrency}
            </Text>

            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Alternative}
              style={styles.subtitle}
            >
              {orderState === OrderStatus.SUCCESS
                ? strings('deposit.order_processing.success_description', {
                    amount: order.amount,
                    currency: order.currency,
                  })
                : orderState === OrderStatus.ERROR
                ? strings('deposit.order_processing.error_description')
                : strings('deposit.order_processing.description')}
            </Text>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('deposit.order_processing.account')}
              </Text>
              <View style={styles.accountInfo}>
                {selectedAddress && (
                  <Avatar
                    variant={AvatarVariant.Account}
                    type={accountAvatarType}
                    accountAddress={selectedAddress}
                    size={AvatarSize.Xs}
                  />
                )}
                <Text variant={TextVariant.BodyMD}>{accountName}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('deposit.order_processing.network')}
              </Text>
              <View style={styles.networkInfo}>
                <Image
                  source={getNetworkImageSource({ chainId })}
                  style={styles.networkIcon}
                />
                <Text variant={TextVariant.BodyMD}>{networkName}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('deposit.order_processing.order_id')}
              </Text>
              <TouchableOpacity
                style={styles.orderIdContainer}
                onPress={handleCopyOrderId}
              >
                <Text variant={TextVariant.BodyMD}>..{shortOrderId}</Text>
                <Icon
                  name={IconName.Copy}
                  size={IconSize.Lg}
                  color={theme.colors.icon.default}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.separator} />

            {Boolean(orderFee) && (
              <View style={styles.detailRow}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('deposit.order_processing.fees')}
                </Text>
                <Text variant={TextVariant.BodyMD}>{orderFee}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('deposit.order_processing.total')}
              </Text>
              <Text variant={TextVariant.BodyMD}>
                {formatCurrency(totalAmount || order.amount, order.currency)}
              </Text>
            </View>
          </View>

          {isDepositOrder(order.data) && order.data.providerOrderLink && (
            <TouchableOpacity
              style={styles.transakLink}
              onPress={handleViewInTransak}
            >
              <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
                {strings(
                  'deposit.order_processing.view_order_details_in_transak',
                )}
              </Text>
              <Icon
                name={IconName.Export}
                size={IconSize.Sm}
                color={theme.colors.primary.default}
              />
            </TouchableOpacity>
          )}
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <View style={styles.buttonContainer}>
            <StyledButton
              type="confirm"
              onPress={handleMainAction}
              testID="main-action-button"
            >
              {orderState === OrderStatus.ERROR
                ? strings('deposit.order_processing.error_button')
                : strings('deposit.order_processing.button')}
            </StyledButton>
            {orderState === OrderStatus.ERROR && (
              <StyledButton type="normal" onPress={handleContactSupport}>
                {strings('deposit.order_processing.contact_support_button')}
              </StyledButton>
            )}
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default OrderProcessing;
