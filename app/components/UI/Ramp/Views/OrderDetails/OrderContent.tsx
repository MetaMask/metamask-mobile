import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import type { RampsOrder } from '@metamask/ramps-controller';
import { trackEvent as trackRampsEvent } from '../../hooks/useAnalytics';
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
import {
  FIAT_ORDER_STATES,
  FIAT_ORDER_PROVIDERS,
} from '../../../../../constants/on-ramp';
import { toDateFormat } from '../../../../../util/date';
import { renderFiat } from '../../../../../util/number';
import { getNetworkImageSource } from '../../../../../util/networks';
import Logger from '../../../../../util/Logger';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { getOrderAmount } from '../../utils/getOrderAmount';
import { hasDepositOrderField } from '../../Deposit/utils';
import BankDetailRow from '../../Deposit/components/BankDetailRow/BankDetailRow';
import Routes from '../../../../../constants/navigation/Routes';

const styles = StyleSheet.create({
  badgeWrapperCenter: {
    alignSelf: 'center',
  },
});

/**
 * Extracts provider-specific fields from order.data that aren't available
 * on the FiatOrder type itself.
 */
function getProviderSpecificData(order: FiatOrder) {
  const data = order.data;
  if (!data || typeof data !== 'object') {
    return {};
  }

  const asRampsOrder = data as Partial<RampsOrder>;

  return {
    providerOrderLink: asRampsOrder.providerOrderLink,
    cryptoIconUrl: asRampsOrder.cryptoCurrency?.iconUrl,
    fiatDecimals: asRampsOrder.fiatCurrency?.decimals ?? 2,
    providerSupportUrl:
      asRampsOrder.provider?.links?.find((link) =>
        link.name.toLowerCase().includes('support'),
      )?.url ?? asRampsOrder.providerOrderLink,
    statusDescription: asRampsOrder.statusDescription,
    paymentDetails: hasDepositOrderField(data, 'paymentDetails')
      ? data.paymentDetails
      : undefined,
  };
}

interface OrderContentProps {
  order: FiatOrder;
  showCloseButton?: boolean;
}

const OrderContent: React.FC<OrderContentProps> = ({
  order,
  showCloseButton = false,
}) => {
  const navigation = useNavigation();
  const providerData = useMemo(() => getProviderSpecificData(order), [order]);

  const shortOrderId = order.id
    ? order.id.length > 8
      ? `...${order.id.slice(-6)}`
      : order.id
    : '...';

  const handleCopyOrderId = useCallback(() => {
    if (order.id) {
      Clipboard.setString(order.id);
    }
  }, [order.id]);

  const handleProviderLinkPress = useCallback(async () => {
    const url = providerData.providerOrderLink;
    if (!url) return;
    try {
      trackRampsEvent('RAMPS_EXTERNAL_LINK_CLICKED', {
        location: 'Order Details',
        text: 'View on Provider',
        url_domain: new URL(url).hostname,
        ramp_type: 'UNIFIED_BUY_2',
      });
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
  }, [providerData.providerOrderLink, navigation]);

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

  const isLoading = !order.amount;

  const handleClose = useCallback(() => {
    trackRampsEvent('RAMPS_CLOSE_BUTTON_CLICKED', {
      location: 'Order Details',
      ramp_type: 'UNIFIED_BUY_2',
    });
    navigation.goBack();
  }, [navigation]);

  const providerName = getProviderName(order.provider, order.data);

  const handleInfoPress = useCallback(() => {
    trackRampsEvent('RAMPS_EXTERNAL_LINK_CLICKED', {
      location: 'Order Details',
      text: 'Processing Info',
      ramp_type: 'UNIFIED_BUY_2',
    });
    navigation.navigate(
      ...createProcessingInfoModalNavigationDetails({
        providerName,
        providerSupportUrl: providerData.providerSupportUrl,
        statusDescription: providerData.statusDescription,
      }),
    );
  }, [
    navigation,
    providerName,
    providerData.providerSupportUrl,
    providerData.statusDescription,
  ]);

  const fiatDecimals = providerData.fiatDecimals ?? 2;
  const fiatDenomSymbol = order.currencySymbol || '';

  // Normalize chainId to hex so getNetworkImageSource can find it.
  // Some providers return plain decimal (e.g., '1'), others return CAIP-2 ('eip155:1') or hex ('0x1').
  // getNetworkImageSource handles CAIP and hex but not plain decimal.
  const normalizeChainIdForBadge = (chainId: string): string => {
    if (!chainId || chainId.includes(':') || chainId.startsWith('0x')) {
      return chainId;
    }
    const decimal = parseInt(chainId, 10);
    return isNaN(decimal) ? chainId : `0x${decimal.toString(16)}`;
  };

  const normalizedNetworkChainId = normalizeChainIdForBadge(
    order.network || '',
  );
  const networkImageSource = normalizedNetworkChainId
    ? getNetworkImageSource({ chainId: normalizedNetworkChainId })
    : null;

  // Bank transfer details helpers
  const capitalizeWords = useCallback(
    (text: string): string =>
      text
        .split(' ')
        .map((word) => {
          if (word === '') {
            return word;
          }
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' '),
    [],
  );

  const getFieldValue = useCallback(
    (fieldName: string): string | null => {
      if (
        !providerData.paymentDetails ||
        providerData.paymentDetails.length === 0
      )
        return null;

      const field = providerData.paymentDetails[0].fields.find(
        (f) => f.name === fieldName,
      );
      if (!field?.value) return null;

      return capitalizeWords(field.value);
    },
    [providerData.paymentDetails, capitalizeWords],
  );

  const hasBankDetails = Boolean(providerData.paymentDetails);
  const showManageBankTransfer =
    hasBankDetails &&
    order.state === FIAT_ORDER_STATES.CREATED &&
    order.provider === FIAT_ORDER_PROVIDERS.RAMPS_V2;

  const handleManageBankTransfer = useCallback(() => {
    navigation.navigate(Routes.RAMP.BANK_DETAILS_STANDALONE, {
      orderId: order.id,
      shouldUpdate: false,
    });
  }, [navigation, order.id]);

  const bankDetailFields = useMemo(() => {
    if (!hasBankDetails) return null;

    const amount = getFieldValue('Amount');
    const firstName = getFieldValue('First Name (Beneficiary)');
    const lastName = getFieldValue('Last Name (Beneficiary)');
    const accountName =
      firstName || lastName
        ? `${firstName ?? ''} ${lastName ?? ''}`.trim()
        : null;
    const accountType = getFieldValue('Account Type');
    const bankName = getFieldValue('Bank Name');
    const routingNumber = getFieldValue('Routing Number');
    const accountNumber = getFieldValue('Account Number');
    const iban = getFieldValue('IBAN');
    const bic = getFieldValue('BIC');

    return {
      amount,
      accountName,
      accountType,
      bankName,
      routingNumber,
      accountNumber,
      iban,
      bic,
    };
  }, [hasBankDetails, getFieldValue]);

  return (
    <Box twClassName="w-full">
      <Box twClassName="items-center pt-8 pb-6">
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          style={styles.badgeWrapperCenter}
          badgeElement={
            networkImageSource ? (
              <BadgeNetwork
                name={normalizedNetworkChainId}
                imageSource={networkImageSource}
              />
            ) : null
          }
        >
          <AvatarToken
            name={order.cryptocurrency}
            imageSource={
              providerData.cryptoIconUrl
                ? { uri: providerData.cryptoIconUrl }
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
          {getOrderAmount(order)} {order.cryptocurrency}
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
              {providerData.providerOrderLink && (
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
                        provider: providerName,
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
            {renderFiat(Number(order.fee ?? 0), order.currency, fiatDecimals)}
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
              Number(order.amount ?? 0),
              order.currency,
              fiatDecimals,
            )}
          </Text>
        )}
      </Box>

      {hasBankDetails && bankDetailFields && !isLoading && (
        <Box twClassName="mt-4 pt-4 border-t border-alternative">
          <Text
            variant={TextVariant.HeadingSm}
            fontWeight={FontWeight.Bold}
            twClassName="mb-4"
          >
            {strings('deposit.bank_details.main_title')}
          </Text>

          {bankDetailFields.amount && (
            <BankDetailRow
              label={strings('deposit.bank_details.transfer_amount')}
              value={bankDetailFields.amount}
            />
          )}
          {bankDetailFields.accountName && (
            <BankDetailRow
              label={strings('deposit.bank_details.account_holder_name')}
              value={bankDetailFields.accountName}
            />
          )}
          {bankDetailFields.routingNumber && (
            <BankDetailRow
              label={strings('deposit.bank_details.routing_number')}
              value={bankDetailFields.routingNumber}
            />
          )}
          {bankDetailFields.accountNumber && (
            <BankDetailRow
              label={strings('deposit.bank_details.account_number')}
              value={bankDetailFields.accountNumber}
            />
          )}
          {bankDetailFields.iban && (
            <BankDetailRow
              label={strings('deposit.bank_details.iban')}
              value={bankDetailFields.iban}
            />
          )}
          {bankDetailFields.bic && (
            <BankDetailRow
              label={strings('deposit.bank_details.bic')}
              value={bankDetailFields.bic}
            />
          )}
          {bankDetailFields.accountType && (
            <BankDetailRow
              label={strings('deposit.bank_details.account_type')}
              value={bankDetailFields.accountType}
            />
          )}
          {bankDetailFields.bankName && (
            <BankDetailRow
              label={strings('deposit.bank_details.bank_name')}
              value={bankDetailFields.bankName}
            />
          )}

          {showManageBankTransfer && (
            <Box twClassName="mt-4">
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                label={strings('deposit.bank_details.button')}
                onPress={handleManageBankTransfer}
              />
            </Box>
          )}
        </Box>
      )}

      <Box twClassName="pt-4 pb-4 w-full">
        {providerData.statusDescription && (
          <TouchableOpacity onPress={handleInfoPress}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              twClassName="items-center justify-center mb-4"
            >
              <Text variant={TextVariant.BodySm} twClassName="text-alternative">
                {providerData.statusDescription}
              </Text>
              <Icon
                name={IconName.Info}
                size={IconSize.Sm}
                twClassName="text-alternative ml-1"
              />
            </Box>
          </TouchableOpacity>
        )}

        {showCloseButton && (
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('ramps_order_details.close')}
            onPress={handleClose}
          />
        )}
      </Box>
    </Box>
  );
};

export default OrderContent;
