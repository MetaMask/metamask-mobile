import React, { useCallback } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../../locales/i18n';
import { formatCurrency, hasDepositOrderField } from '../../utils';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../../selectors/networkController';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { useAccountGroupName } from '../../../../../hooks/multichainAccounts/useAccountGroupName';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import BadgeNetwork from '../../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Loader from '../../../../../../component-library/components-temp/Loader/Loader';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { FiatOrder } from '../../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';
import styleSheet from './DepositOrderContent.styles';
import { DepositOrder } from '@consensys/native-ramps-sdk';
import { selectAvatarAccountType } from '../../../../../../selectors/settings';

interface DepositOrderContentProps {
  order: FiatOrder;
}

const DepositOrderContent: React.FC<DepositOrderContentProps> = ({ order }) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const accountName = useAccountGroupName();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const accountAvatarType = useSelector(selectAvatarAccountType);

  const getCryptoToken = () => {
    if (!order?.data || !hasDepositOrderField(order.data, 'cryptoCurrency')) {
      return null;
    }
    return order.data.cryptoCurrency;
  };

  const cryptoToken = getCryptoToken();

  const allNetworkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const depositOrder = order.data as DepositOrder;
  const depositNetwork = depositOrder?.network;
  const chainId = depositNetwork?.chainId;
  const networkName =
    depositNetwork.name ||
    allNetworkConfigurations[chainId as `${string}:${string}`]?.name ||
    'Unknown Network';

  const networkImageSource = chainId
    ? getNetworkImageSource({
        chainId,
      })
    : null;

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

  const shortOrderId = providerOrderId?.slice(-6) ?? order.id.slice(-6);

  const orderFee = formatCurrency(
    order.fee || order.cryptoFee || 0,
    order.currency,
  );

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
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                networkImageSource ? (
                  <BadgeNetwork
                    name={networkName}
                    imageSource={networkImageSource}
                  />
                ) : null
              }
            >
              <AvatarToken
                name={cryptoToken.symbol}
                imageSource={{ uri: cryptoToken.iconUrl }}
                size={AvatarSize.Lg}
              />
            </BadgeWrapper>
          ) : null}
        </View>

        <Text variant={TextVariant.DisplayMD} style={styles.mainAmount}>
          {order.cryptoAmount} {order.cryptocurrency}
        </Text>

        {order?.data &&
        hasDepositOrderField(order.data, 'statusDescription') &&
        order.data.statusDescription ? (
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Alternative}
            style={styles.subtitle}
          >
            {order.data.statusDescription}
          </Text>
        ) : null}
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
            {networkImageSource ? (
              <Image source={networkImageSource} style={styles.networkIcon} />
            ) : null}
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
            {formatCurrency(order.amount, order.currency)}
          </Text>
        </View>
      </View>
    </>
  );
};

export default DepositOrderContent;
