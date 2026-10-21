import React, { useCallback } from 'react';
import { ActivityIndicator } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSelector } from 'react-redux';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarNetwork,
  AvatarNetworkSize,
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  FontFamily,
  Icon,
  IconColor,
  IconName,
  IconSize,
  KeyValueRow,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { hasDepositOrderField } from '../../utils/depositUtils';
import { useFormatters } from '../../../../hooks/useFormatters';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { getNetworkImageSource } from '../../../../../util/networks';
import { useAccountGroupName } from '../../../../hooks/multichainAccounts/useAccountGroupName';
import { getAvatarAccountVariant } from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { FiatOrder } from '../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { DepositOrder } from '../../types/legacyDeposit';
import { selectAvatarAccountType } from '../../../../../selectors/settings';

interface DepositOrderContentProps {
  order: FiatOrder;
}

const DepositOrderContent: React.FC<DepositOrderContentProps> = ({ order }) => {
  const { formatCurrency } = useFormatters();
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

  const isCompleted = order.state === FIAT_ORDER_STATES.COMPLETED;
  const isFailed =
    order.state === FIAT_ORDER_STATES.CANCELLED ||
    order.state === FIAT_ORDER_STATES.FAILED;
  const isProcessing =
    order.state === FIAT_ORDER_STATES.PENDING ||
    order.state === FIAT_ORDER_STATES.CREATED;

  const providerOrderId = (order.data as DepositOrder).providerOrderId;

  const handleCopyOrderId = useCallback(() => {
    if (providerOrderId) {
      Clipboard.setString(providerOrderId);
    }
  }, [providerOrderId]);

  const shortOrderId = providerOrderId?.slice(-6) ?? order.id.slice(-6);

  const currency = order.currency || 'USD';

  const orderFee = formatCurrency(
    Number(order.fee || order.cryptoFee || 0),
    currency,
  );

  const statusIconClassName = isCompleted
    ? 'bg-success-muted'
    : isFailed
      ? 'bg-error-muted'
      : '';

  return (
    <>
      <Box twClassName="mb-6 items-center">
        <Box twClassName="mb-5 flex-row items-center gap-4">
          <Box
            twClassName={`h-10 w-10 items-center justify-center rounded-full ${statusIconClassName}`}
          >
            {isProcessing ? (
              <ActivityIndicator size="large" />
            ) : isCompleted ? (
              <Icon
                name={IconName.CheckBold}
                size={IconSize.Xl}
                color={IconColor.SuccessDefault}
              />
            ) : (
              <Icon
                name={IconName.Close}
                size={IconSize.Xl}
                color={IconColor.ErrorDefault}
              />
            )}
          </Box>
          {cryptoToken ? (
            <BadgeWrapper
              position={BadgeWrapperPosition.BottomRight}
              badge={
                networkImageSource ? (
                  <BadgeNetwork name={networkName} src={networkImageSource} />
                ) : null
              }
            >
              <AvatarToken
                name={cryptoToken.symbol}
                src={{ uri: cryptoToken.iconUrl }}
                size={AvatarTokenSize.Lg}
              />
            </BadgeWrapper>
          ) : null}
        </Box>

        <Text
          variant={TextVariant.AmountDisplayLg}
          fontFamily={FontFamily.Hero}
          twClassName="mb-4 text-center"
        >
          {order.cryptoAmount} {order.cryptocurrency}
        </Text>

        {order?.data &&
        hasDepositOrderField(order.data, 'statusDescription') &&
        order.data.statusDescription ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {order.data.statusDescription}
          </Text>
        ) : null}
      </Box>

      <Box twClassName="mb-4 rounded-3xl border border-muted bg-default py-2">
        <KeyValueRow
          keyLabel={strings('deposit.order_processing.account')}
          value={accountName ?? ''}
          valueTextProps={{ twClassName: 'shrink min-w-0' }}
          valueStartAccessory={
            selectedAddress ? (
              <AvatarAccount
                address={selectedAddress}
                size={AvatarAccountSize.Xs}
                variant={getAvatarAccountVariant(accountAvatarType)}
              />
            ) : undefined
          }
        />
        <KeyValueRow
          keyLabel={strings('deposit.order_processing.network')}
          value={networkName}
          valueStartAccessory={
            networkImageSource ? (
              <AvatarNetwork
                name={networkName}
                size={AvatarNetworkSize.Xs}
                src={networkImageSource}
              />
            ) : undefined
          }
        />
        <KeyValueRow
          keyLabel={strings('deposit.order_processing.order_id')}
          value={`..${shortOrderId}`}
          valueEndButtonIconProps={{
            iconName: IconName.Copy,
            accessibilityLabel: strings('deposit.order_processing.order_id'),
            onPress: handleCopyOrderId,
          }}
        />

        <Box twClassName="my-2 h-px bg-border-muted" />

        {Boolean(orderFee) && (
          <KeyValueRow
            keyLabel={strings('deposit.order_processing.fees')}
            value={orderFee}
          />
        )}

        <KeyValueRow
          keyLabel={strings('deposit.order_processing.total')}
          value={formatCurrency(Number(order.amount), currency)}
        />
      </Box>
    </>
  );
};

export default DepositOrderContent;
