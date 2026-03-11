import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import { type RampsOrder, RampsOrderStatus } from '@metamask/ramps-controller';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
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
import { toDateFormat } from '../../../../../util/date';
import { renderFiat } from '../../../../../util/number';
import { getNetworkImageSource } from '../../../../../util/networks';
import Logger from '../../../../../util/Logger';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { hasDepositOrderField } from '../../Deposit/utils';
import BankDetailRow from '../../Deposit/components/BankDetailRow/BankDetailRow';
import Routes from '../../../../../constants/navigation/Routes';
import { RampsOrderDetailsSelectorsIDs } from './OrderDetails.testIds';

const localStyles = StyleSheet.create({
  badgeWrapperCenter: {
    alignSelf: 'center',
  },
  inlineIcon: {
    transform: [{ translateY: 4 }],
  },
});

interface OrderContentProps {
  order: RampsOrder;
  showCloseButton?: boolean;
}

const OrderContent: React.FC<OrderContentProps> = ({
  order,
  showCloseButton = false,
}) => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const providerName = order.provider?.name ?? '';
  const providerOrderLink = order.providerOrderLink;
  const cryptoIconUrl = order.cryptoCurrency?.iconUrl;
  const fiatDecimals = order.fiatCurrency?.decimals ?? 2;
  const providerSupportUrl =
    order.provider?.links?.find((link) =>
      link.name.toLowerCase().includes('support'),
    )?.url ?? providerOrderLink;

  const paymentDetails = hasDepositOrderField(order, 'paymentDetails')
    ? (
        order as RampsOrder & {
          paymentDetails: {
            fiatCurrency: string;
            paymentMethod: string;
            fields: { name: string; id: string; value: string }[];
          }[];
        }
      ).paymentDetails
    : undefined;

  const shortOrderId = order.providerOrderId
    ? order.providerOrderId.length > 8
      ? `...${order.providerOrderId.slice(-6)}`
      : order.providerOrderId
    : '...';

  const handleCopyOrderId = useCallback(() => {
    if (order.providerOrderId) {
      Clipboard.setString(order.providerOrderId);
    }
  }, [order.providerOrderId]);

  const handleProviderLinkPress = useCallback(async () => {
    if (!providerOrderLink) return;
    let urlDomain: string | undefined;
    try {
      urlDomain = new URL(providerOrderLink).hostname;
    } catch {
      urlDomain = providerOrderLink;
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_EXTERNAL_LINK_CLICKED)
        .addProperties({
          location: 'Order Details',
          external_link_description: 'View on Provider',
          url_domain: urlDomain,
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    try {
      if (await InAppBrowser.isAvailable()) {
        await InAppBrowser.open(providerOrderLink);
      } else {
        navigation.navigate('Webview', {
          screen: 'SimpleWebview',
          params: { url: providerOrderLink },
        });
      }
    } catch (err) {
      Logger.error(err as Error, {
        message: 'RampsOrderContent: Failed to open provider link',
        link: providerOrderLink,
      });
    }
  }, [providerOrderLink, navigation, createEventBuilder, trackEvent]);

  const getStatusText = () => {
    switch (order.status) {
      case RampsOrderStatus.Pending:
      case RampsOrderStatus.Created:
      case RampsOrderStatus.Precreated:
      case RampsOrderStatus.Unknown:
        return strings('ramps_order_details.processing');
      case RampsOrderStatus.Completed:
        return strings('ramps_order_details.complete');
      case RampsOrderStatus.Failed:
        return strings('ramps_order_details.failed');
      case RampsOrderStatus.Cancelled:
        return strings('ramps_order_details.cancelled');
      case RampsOrderStatus.IdExpired:
        return strings('ramps_order_details.failed');
      default:
        return '...';
    }
  };

  const getStatusColor = () => {
    switch (order.status) {
      case RampsOrderStatus.Pending:
      case RampsOrderStatus.Created:
      case RampsOrderStatus.Precreated:
      case RampsOrderStatus.Unknown:
        return 'text-warning-default';
      case RampsOrderStatus.Completed:
        return 'text-success-default';
      case RampsOrderStatus.Failed:
      case RampsOrderStatus.Cancelled:
      case RampsOrderStatus.IdExpired:
        return 'text-error-default';
      default:
        return 'text-default';
    }
  };

  const isLoading = !order.fiatAmount;

  const handleClose = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_CLOSE_BUTTON_CLICKED)
        .addProperties({
          location: 'Order Details',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    navigation.goBack();
  }, [navigation, createEventBuilder, trackEvent]);

  const handleInfoPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_INFO_TOOLTIP_CLICKED)
        .addProperties({
          location: 'Order Details',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    navigation.navigate(
      ...createProcessingInfoModalNavigationDetails({
        providerName,
        providerSupportUrl,
        statusDescription: order.statusDescription,
      }),
    );
  }, [
    navigation,
    providerName,
    providerSupportUrl,
    order.statusDescription,
    createEventBuilder,
    trackEvent,
  ]);

  const fiatDenomSymbol = order.fiatCurrency?.denomSymbol ?? '';
  const fiatCurrencyCode = order.fiatCurrency?.symbol ?? '';
  const cryptoSymbol = order.cryptoCurrency?.symbol ?? '';

  const normalizeChainIdForBadge = (chainId: string): string => {
    if (!chainId || chainId.includes(':') || chainId.startsWith('0x')) {
      return chainId;
    }
    const decimal = parseInt(chainId, 10);
    return isNaN(decimal) ? chainId : `0x${decimal.toString(16)}`;
  };

  const normalizedNetworkChainId = normalizeChainIdForBadge(
    order.network?.chainId ?? '',
  );
  const networkImageSource = normalizedNetworkChainId
    ? getNetworkImageSource({ chainId: normalizedNetworkChainId })
    : null;

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
      if (!paymentDetails || paymentDetails.length === 0) return null;

      const field = paymentDetails[0].fields.find((f) => f.name === fieldName);
      if (!field?.value) return null;

      return capitalizeWords(field.value);
    },
    [paymentDetails, capitalizeWords],
  );

  const hasBankDetails = Boolean(paymentDetails);
  const showManageBankTransfer =
    hasBankDetails && order.status === RampsOrderStatus.Created;

  const handleManageBankTransfer = useCallback(() => {
    navigation.navigate(Routes.RAMP.BANK_DETAILS_STANDALONE, {
      orderId: order.providerOrderId,
      shouldUpdate: false,
    });
  }, [navigation, order.providerOrderId]);

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
    <Box twClassName="w-full flex-1">
      <Box twClassName="items-center pt-8 pb-6">
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          style={localStyles.badgeWrapperCenter}
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
            name={cryptoSymbol}
            imageSource={cryptoIconUrl ? { uri: cryptoIconUrl } : undefined}
            size={AvatarSize.Lg}
          />
        </BadgeWrapper>

        <Text
          testID={RampsOrderDetailsSelectorsIDs.TOKEN_AMOUNT}
          variant={TextVariant.DisplayLg}
          fontWeight={FontWeight.Bold}
          twClassName="mt-6 text-center"
        >
          {order.cryptoAmount} {cryptoSymbol}
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
              {providerOrderLink && (
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
            {renderFiat(
              Number(order.totalFeesFiat ?? 0),
              fiatCurrencyCode,
              fiatDecimals,
            )}
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
              Number(order.fiatAmount ?? 0),
              fiatCurrencyCode,
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

      <Box
        twClassName={
          showCloseButton ? 'w-full pb-4 mt-auto' : 'w-full pb-4 pt-4'
        }
      >
        {order.statusDescription && (
          <Box twClassName={showCloseButton ? 'mb-4' : ''}>
            <TouchableOpacity onPress={handleInfoPress}>
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-alternative text-center"
              >
                {(order.status === RampsOrderStatus.Pending ||
                  order.status === RampsOrderStatus.Created ||
                  order.status === RampsOrderStatus.Precreated ||
                  order.status === RampsOrderStatus.Unknown) &&
                order.statusDescription.startsWith('Your order')
                  ? order.statusDescription.replace(
                      /^Your order.*?is processing\.\s*/,
                      '',
                    ) || order.statusDescription
                  : order.statusDescription}{' '}
                <Icon
                  name={IconName.Info}
                  size={IconSize.Sm}
                  twClassName="text-alternative"
                  style={localStyles.inlineIcon}
                />
              </Text>
            </TouchableOpacity>
          </Box>
        )}
        {showCloseButton && (
          <Button
            testID={RampsOrderDetailsSelectorsIDs.CLOSE_BUTTON}
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
