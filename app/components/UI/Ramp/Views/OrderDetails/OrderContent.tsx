import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import type { RampsOrder } from '@metamask/ramps-controller';
import { createProcessingInfoModalNavigationDetails } from '../Modals/ProcessingInfoModal/ProcessingInfoModal';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import BadgeNetwork from '../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { strings } from '../../../../../../locales/i18n';
import { FiatOrder, getProviderName } from '../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { toDateFormat } from '../../../../../util/date';
import { renderFiat } from '../../../../../util/number';
import { getNetworkImageSource } from '../../../../../util/networks';
import Logger from '../../../../../util/Logger';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import { getOrderAmount } from '../../utils/getOrderAmount';

const styles = StyleSheet.create({
  badgeWrapperCenter: {
    alignSelf: 'center',
  },
});

interface OrderContentProps {
  order: FiatOrder;
  showCloseButton?: boolean;
}

const OrderContent: React.FC<OrderContentProps> = ({
  order,
  showCloseButton = false,
}) => {
  const navigation = useNavigation();
  const data = order.data as RampsOrder | undefined;

  const providerOrderId = data?.providerOrderId;
  const shortOrderId = providerOrderId
    ? providerOrderId.length > 8
      ? `..${providerOrderId.slice(-6)}`
      : providerOrderId
    : '...';

  const handleCopyOrderId = useCallback(() => {
    if (providerOrderId) {
      Clipboard.setString(providerOrderId);
    }
  }, [providerOrderId]);

  const handleProviderLinkPress = useCallback(async () => {
    const url = data?.providerOrderLink;
    if (!url) return;
    try {
      if (await InAppBrowser.isAvailable()) {
        await InAppBrowser.open(url);
      } else {
        navigation.navigate('Webview', {
          screen: 'SimpleWebview',
          params: { url },
        });
      }
    } catch (err) {
      Logger.error(err as Error, {
        message: 'RampsOrderContent: Failed to open provider link',
        link: url,
      });
    }
  }, [data?.providerOrderLink, navigation]);

  const getStatusText = () => {
    switch (order.state) {
      case FIAT_ORDER_STATES.PENDING:
      case FIAT_ORDER_STATES.CREATED:
        return strings('ramps_order_details.processing');
      case FIAT_ORDER_STATES.COMPLETED:
        return strings('ramps_order_details.complete');
      case FIAT_ORDER_STATES.FAILED:
        return strings('ramps_order_details.failed');
      case FIAT_ORDER_STATES.CANCELLED:
        return strings('ramps_order_details.cancelled');
      default:
        return '...';
    }
  };

  const getStatusColor = () => {
    switch (order.state) {
      case FIAT_ORDER_STATES.PENDING:
      case FIAT_ORDER_STATES.CREATED:
        return 'text-warning-default';
      case FIAT_ORDER_STATES.COMPLETED:
        return 'text-success-default';
      case FIAT_ORDER_STATES.FAILED:
      case FIAT_ORDER_STATES.CANCELLED:
        return 'text-error-default';
      default:
        return 'text-default';
    }
  };

  const isLoading = !data?.fiatAmount;

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const providerName = getProviderName(order.provider, order.data);
  const providerSupportUrl =
    data?.provider?.links?.find((link) =>
      link.name.toLowerCase().includes('support'),
    )?.url ?? data?.providerOrderLink;

  const handleInfoPress = useCallback(() => {
    navigation.navigate(
      ...createProcessingInfoModalNavigationDetails({
        providerName,
        providerSupportUrl,
      }),
    );
  }, [navigation, providerName, providerSupportUrl]);

  const cryptoSymbol = data?.cryptoCurrency?.symbol || order.cryptocurrency;
  const fiatDecimals = data?.fiatCurrency?.decimals ?? 2;
  const fiatDenomSymbol = data?.fiatCurrency?.denomSymbol || '';
  const fiatSymbol = data?.fiatCurrency?.symbol || order.currency;

  const networkChainId = data?.cryptoCurrency?.chainId;
  const networkImageSource = networkChainId
    ? getNetworkImageSource({ chainId: networkChainId })
    : null;

  return (
    <Box twClassName="w-full">
      <Box twClassName="items-center pt-8 pb-6">
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          style={styles.badgeWrapperCenter}
          badgeElement={
            networkImageSource ? (
              <BadgeNetwork
                name={networkChainId || ''}
                imageSource={networkImageSource}
              />
            ) : null
          }
        >
          <AvatarToken
            name={cryptoSymbol}
            imageSource={
              data?.cryptoCurrency?.iconUrl
                ? { uri: data.cryptoCurrency.iconUrl }
                : undefined
            }
            size={AvatarSize.Lg}
          />
        </BadgeWrapper>

        <Text
          variant={TextVariant.DisplayLg}
          fontWeight={FontWeight.Bold}
          twClassName="mt-6 text-center"
        >
          {getOrderAmount(order)} {cryptoSymbol}
        </Text>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        twClassName="py-3"
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-default"
        >
          {strings('ramps_order_details.status')}
        </Text>
        <Box twClassName="items-end">
          {isLoading ? (
            <Box twClassName="bg-muted rounded h-[18px] w-24" />
          ) : (
            <>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                twClassName={getStatusColor()}
              >
                {getStatusText()}
              </Text>
              {data?.providerOrderLink && (
                <TouchableOpacity onPress={handleProviderLinkPress}>
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    twClassName="items-center mt-1"
                  >
                    <Text
                      variant={TextVariant.BodySm}
                      twClassName="text-primary-default mr-1"
                    >
                      {strings('ramps_order_details.view_on_provider', {
                        provider: getProviderName(order.provider, order.data),
                      })}
                    </Text>
                    <Icon
                      name={IconName.Export}
                      size={IconSize.Sm}
                      twClassName="text-primary-default"
                    />
                  </Box>
                </TouchableOpacity>
              )}
            </>
          )}
        </Box>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        twClassName="py-3"
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-default"
        >
          {strings('ramps_order_details.order_id')}
        </Text>
        {isLoading ? (
          <Box twClassName="bg-muted rounded h-[18px] w-32" />
        ) : (
          <TouchableOpacity onPress={handleCopyOrderId}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              twClassName="items-center"
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                twClassName="mr-2"
              >
                {shortOrderId}
              </Text>
              <Icon
                name={IconName.Copy}
                size={IconSize.Md}
                twClassName="text-default"
              />
            </Box>
          </TouchableOpacity>
        )}
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        twClassName="py-3"
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-default"
        >
          {strings('ramps_order_details.date_and_time')}
        </Text>
        {isLoading ? (
          <Box twClassName="bg-muted rounded h-[18px] w-40" />
        ) : (
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {order.createdAt ? toDateFormat(order.createdAt) : '...'}
          </Text>
        )}
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        twClassName="py-3"
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-default"
        >
          {strings('ramps_order_details.fees')}
        </Text>
        {isLoading ? (
          <Box twClassName="bg-muted rounded h-[18px] w-20" />
        ) : (
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {fiatDenomSymbol}
            {renderFiat(data?.totalFeesFiat ?? 0, fiatSymbol, fiatDecimals)}
          </Text>
        )}
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        twClassName="py-3"
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-default"
        >
          {strings('ramps_order_details.total')}
        </Text>
        {isLoading ? (
          <Box twClassName="bg-muted rounded h-[18px] w-24" />
        ) : (
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {fiatDenomSymbol}
            {renderFiat(
              data?.fiatAmount ?? order.amount ?? 0,
              fiatSymbol,
              fiatDecimals,
            )}
          </Text>
        )}
      </Box>

      <Box twClassName="pt-4 pb-4 items-center">
        <TouchableOpacity onPress={handleInfoPress}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="items-center mb-4"
          >
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {strings('ramps_order_details.card_processing_info')}
            </Text>
            <Icon
              name={IconName.Info}
              size={IconSize.Sm}
              twClassName="text-alternative ml-1"
            />
          </Box>
        </TouchableOpacity>

        {showCloseButton && (
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            label={strings('ramps_order_details.close')}
            onPress={handleClose}
          />
        )}
      </Box>
    </Box>
  );
};

export default OrderContent;
