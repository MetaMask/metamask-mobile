import React, { useCallback } from 'react';
import { View, TouchableOpacity, Image, Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { RootState } from '../../../../../../reducers';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../../locales/i18n';
import {
  formatCurrency,
  getCryptoCurrencyFromTransakId,
  hasDepositOrderField,
} from '../../utils';
import { selectChainId } from '../../../../../../selectors/networkController';
import { selectEvmNetworkName } from '../../../../../../selectors/networkInfos';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { useAccountName } from '../../../../../hooks/useAccountName';
import Avatar, {
  AvatarAccountType,
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import Loader from '../../../../../../component-library/components-temp/Loader/Loader';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { FiatOrder } from '../../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';
import styleSheet from './DepositOrderContent.styles';
import { SEPA_PAYMENT_METHOD } from '../../constants';
import { DepositOrder } from '@consensys/native-ramps-sdk';

interface DepositOrderContentProps {
  order: FiatOrder;
}

const DepositOrderContent: React.FC<DepositOrderContentProps> = ({ order }) => {
  const { styles, theme } = useStyles(styleSheet, {});
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

  const getCryptoToken = () => {
    if (!hasDepositOrderField(order?.data, 'cryptoCurrency')) {
      return null;
    }
    return getCryptoCurrencyFromTransakId(order.data.cryptoCurrency);
  };

  const cryptoToken = getCryptoToken();

  const getIconContainerStyle = () => {
    if (order.state === FIAT_ORDER_STATES.COMPLETED) {
      return styles.successIconContainer;
    }
    if (
      order.state === FIAT_ORDER_STATES.CANCELLED ||
      order.state === FIAT_ORDER_STATES.FAILED
    ) {
      return styles.errorIconContainer;
    }
    return styles.processingIconContainer;
  };

  const providerOrderId = (order.data as DepositOrder).providerOrderId;

  const handleCopyOrderId = useCallback(() => {
    if (providerOrderId) {
      Clipboard.setString(providerOrderId);
    }
  }, [providerOrderId]);

  const handleViewInTransak = useCallback(() => {
    if (
      hasDepositOrderField(order?.data, 'providerOrderLink') &&
      order.data.providerOrderLink
    ) {
      Linking.openURL(order.data.providerOrderLink);
    }
  }, [order?.data]);

  const shortOrderId = providerOrderId?.slice(-6) ?? order.id.slice(-6);
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

  let subtitle = strings('deposit.order_processing.description');

  if (order.state === FIAT_ORDER_STATES.COMPLETED) {
    subtitle = strings('deposit.order_processing.success_description', {
      amount: order.amount,
      currency: order.currency,
    });
  } else if (order.state === FIAT_ORDER_STATES.FAILED) {
    subtitle = strings('deposit.order_processing.error_description');
  } else if (order.state === FIAT_ORDER_STATES.CANCELLED) {
    subtitle = strings('deposit.order_processing.cancel_order_description');
  } else if (
    order.state === FIAT_ORDER_STATES.PENDING &&
    hasDepositOrderField(order.data, 'paymentMethod') &&
    order.data.paymentMethod === SEPA_PAYMENT_METHOD.id
  ) {
    subtitle = strings('deposit.order_processing.bank_transfer_description');
  }

  return (
    <>
      <View style={styles.mainSection}>
        <View style={styles.iconRow}>
          <View style={getIconContainerStyle()}>
            {order.state === FIAT_ORDER_STATES.PENDING ||
            order.state === FIAT_ORDER_STATES.CREATED ? (
              <Loader size="large" color={theme.colors.primary.default} />
            ) : order.state === FIAT_ORDER_STATES.COMPLETED ? (
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
          {cryptoToken ? (
            <Image
              source={{ uri: cryptoToken.logo }}
              style={styles.cryptoIcon}
            />
          ) : null}
        </View>

        <Text variant={TextVariant.DisplayMD} style={styles.mainAmount}>
          {order.cryptoAmount} {order.cryptocurrency}
        </Text>

        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.subtitle}
        >
          {subtitle}
        </Text>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('deposit.order_processing.account')}
          </Text>
          <View style={styles.accountInfo}>
            {selectedAddress ? (
              <Avatar
                variant={AvatarVariant.Account}
                type={accountAvatarType}
                accountAddress={selectedAddress}
                size={AvatarSize.Xs}
              />
            ) : null}
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
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
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

      {hasDepositOrderField(order.data, 'providerOrderLink') &&
      order.data.providerOrderLink ? (
        <TouchableOpacity
          style={styles.transakLink}
          onPress={handleViewInTransak}
        >
          <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
            {strings('deposit.order_processing.view_order_details_in_transak')}
          </Text>
          <Icon
            name={IconName.Export}
            size={IconSize.Sm}
            color={theme.colors.primary.default}
          />
        </TouchableOpacity>
      ) : null}
    </>
  );
};

export default DepositOrderContent;
