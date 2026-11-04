import React, { useCallback } from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Order, OrderStatusEnum } from '@consensys/on-ramp-sdk';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import Feather from 'react-native-vector-icons/Feather';
import Box from './Box';
import { toDateFormat } from '../../../../../util/date';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import {
  renderFiat,
  renderFromTokenMinimalUnit,
  toTokenMinimalUnit,
} from '../../../../../util/number/bigint';
import { FiatOrder, getProviderName } from '../../../../../reducers/fiatOrders';
import { useLegacySwapsBlockExplorer } from '../../../Bridge/hooks/useLegacySwapsBlockExplorer';
import Spinner from '../../../AnimatedSpinner';
import useAnalytics from '../../hooks/useAnalytics';
import { analytics } from '../../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { trackBlockExplorerLinkClicked } from '../../../../../util/analytics/externalLinkTracking';
import { PROVIDER_LINKS } from '../types';
import Account from './Account';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { getOrderAmount } from '../utils';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import {
  FontWeight,
  KeyValueRow,
  Text as MmdsText,
  TextVariant as MmdsTextVariant,
} from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

/* eslint-disable-next-line import-x/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const failedIcon = require('./images/TransactionIcon_Failed.png');

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    stage: {
      alignItems: 'center',
    },
    seperationBottom: {
      paddingVertical: 4,
      paddingBottom: 16,
    },
    line: {
      backgroundColor: colors.border.muted,
      height: 1,
      marginVertical: 12,
    },
    tokenAmount: {
      fontSize: 24,
      lineHeight: 32,
    },
    row: {
      marginVertical: 4,
    },
    group: {
      marginVertical: 8,
    },
    textCenter: {
      textAlign: 'center',
    },
    textRight: {
      textAlign: 'right',
    },
    underline: {
      textDecorationLine: 'underline',
    },
  });

interface PropsStage {
  order: FiatOrder;
  isTransacted: boolean;
}

const Row: React.FC<{ children: React.ReactNode }> = (props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <View style={styles.row} {...props} />;
};
const Group: React.FC<{ children: React.ReactNode }> = (props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <View style={styles.group} {...props} />;
};

/**
 * Order-detail key/value line.
 * `h-auto` drops KeyValueRow's fixed 40px height so the row keeps the
 * intentional zero vertical padding. Horizontal padding stays the MMDS 16.
 */
const OrderDetailRow = ({
  label,
  value,
  valueSelectable = false,
}: {
  label: string;
  value: string;
  valueSelectable?: boolean;
}) => (
  <KeyValueRow
    twClassName="h-auto"
    keyLabel={label}
    value={value}
    valueTextProps={{
      numberOfLines: undefined,
      selectable: valueSelectable,
    }}
  />
);

const Stage: React.FC<PropsStage> = ({ order, isTransacted }: PropsStage) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const orderData = order.data as Order;

  switch (order.state) {
    case FIAT_ORDER_STATES.COMPLETED: {
      return (
        <View style={styles.stage}>
          <Feather
            name="check-circle"
            size={32}
            color={colors.success.default}
          />
          <Group>
            <Text variant={TextVariant.BodyLGMedium} style={styles.textCenter}>
              {strings('fiat_on_ramp_aggregator.order_details.successful')}
            </Text>
            {orderData.statusDescription ? (
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Alternative}
                style={styles.textCenter}
              >
                {orderData.statusDescription}
              </Text>
            ) : null}
          </Group>
        </View>
      );
    }
    case FIAT_ORDER_STATES.CANCELLED:
    case FIAT_ORDER_STATES.FAILED: {
      return (
        <View style={styles.stage}>
          <Image source={failedIcon} />
          <Group>
            <Text variant={TextVariant.BodyLGMedium} style={styles.textCenter}>
              {order.state === 'FAILED'
                ? strings('fiat_on_ramp_aggregator.order_details.failed')
                : strings('fiat_on_ramp_aggregator.order_details.cancelled')}
            </Text>

            {orderData.statusDescription ? (
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Alternative}
                style={styles.textCenter}
              >
                {orderData.statusDescription}
              </Text>
            ) : null}
          </Group>
        </View>
      );
    }
    case FIAT_ORDER_STATES.CREATED:
      return (
        <View style={styles.stage}>
          <Spinner />
          <Group>
            <Text variant={TextVariant.BodyLGMedium} style={styles.textCenter}>
              {strings(
                isTransacted
                  ? 'transaction.submitted'
                  : 'fiat_on_ramp_aggregator.order_details.pending',
              )}
            </Text>
            {isTransacted && Boolean(orderData.timeDescriptionPending) ? (
              <Text
                variant={TextVariant.BodySM}
                style={styles.textCenter}
                color={TextColor.Alternative}
              >
                {orderData.timeDescriptionPending}
              </Text>
            ) : null}
            {!isTransacted && Boolean(orderData.statusDescription) ? (
              <Text
                variant={TextVariant.BodySM}
                style={styles.textCenter}
                color={TextColor.Alternative}
              >
                {orderData.statusDescription}
              </Text>
            ) : null}
          </Group>
        </View>
      );

    case FIAT_ORDER_STATES.PENDING:
    default: {
      return (
        <View style={styles.stage}>
          <Spinner />
          <Group>
            <Text variant={TextVariant.BodyLGMedium} style={styles.textCenter}>
              {order.state === FIAT_ORDER_STATES.PENDING
                ? strings('fiat_on_ramp_aggregator.order_details.processing')
                : strings('transaction.submitted')}
            </Text>

            {orderData.statusDescription ? (
              <Text
                variant={TextVariant.BodySM}
                style={styles.textCenter}
                color={TextColor.Alternative}
              >
                {orderData.statusDescription}
              </Text>
            ) : null}
          </Group>
        </View>
      );
    }
  }
};

interface Props {
  /**
   * Object that represents the current route info like params passed to it
   */
  order: FiatOrder;
}

const OrderDetails: React.FC<Props> = ({ order }: Props) => {
  const {
    data,
    createdAt,
    amount,
    cryptoFee,
    cryptoAmount,
    currencySymbol,
    currency,
    txHash,
    cryptocurrency,
  } = order;
  const { colors } = useTheme();
  const trackEvent = useAnalytics();
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const explorer = useLegacySwapsBlockExplorer(networkConfigurations);
  const styles = createStyles(colors);
  const date = createdAt && toDateFormat(createdAt);
  const renderAmount = getOrderAmount(order);
  const amountOut = Number(amount) - Number(cryptoFee);

  const exchangeRate =
    (order.data as Order)?.exchangeRate ??
    Number(amountOut) / Number(cryptoAmount);
  const providerName = getProviderName(order.provider, data);

  const handleExplorerLinkPress = useCallback(
    (url: string) => {
      trackBlockExplorerLinkClicked(
        analytics.trackEvent,
        AnalyticsEventBuilder.createEventBuilder,
        {
          location: 'ramp_order_details',
          text: 'Etherscan Transaction',
          url,
        },
      );
      Linking.openURL(url);
      trackEvent('ONRAMP_EXTERNAL_LINK_CLICKED', {
        location: 'Order Details Screen',
        text: 'Etherscan Transaction',
        url_domain: url,
      });
    },
    [trackEvent],
  );

  const handleProviderLinkPress = useCallback(
    (url: string) => {
      Linking.openURL(url);
      trackEvent('ONRAMP_EXTERNAL_LINK_CLICKED', {
        location: 'Order Details Screen',
        text: 'Provider Order Tracking',
        url_domain: url,
      });
    },
    [trackEvent],
  );

  const orderData = data as Order;

  const supportLinkUrl = orderData?.provider?.links?.find(
    (link) => link.name === PROVIDER_LINKS.SUPPORT,
  )?.url;
  const orderLink = orderData?.providerOrderLink;

  return (
    <View>
      <Group>
        <Stage order={order} isTransacted={Boolean(order.sellTxHash)} />
        <Group>
          <Text
            variant={TextVariant.BodyLGMedium}
            style={{
              ...styles.tokenAmount,
              ...styles.textCenter,
            }}
          >
            {renderAmount} {cryptocurrency}
          </Text>
          {orderData?.fiatCurrency?.decimals !== undefined && currencySymbol ? (
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Alternative}
              style={styles.textCenter}
            >
              {currencySymbol}
              {renderFiat(amountOut, currency, orderData.fiatCurrency.decimals)}
            </Text>
          ) : (
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Alternative}
              style={styles.textCenter}
            >
              ... {currency}
            </Text>
          )}
        </Group>

        {Boolean(orderLink) && (
          <Row>
            <TouchableOpacity
              onPress={() => handleProviderLinkPress(orderLink as string)}
            >
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Primary}
                style={styles.textCenter}
              >
                {strings(
                  'fiat_on_ramp_aggregator.order_details.view_order_status',
                  { provider: providerName },
                )}
              </Text>
            </TouchableOpacity>
          </Row>
        )}
      </Group>
      <Group>
        <Box thin compact>
          <Row>
            <Account address={order.account} transparent />
          </Row>
          <Row>
            <OrderDetailRow
              label={strings('fiat_on_ramp_aggregator.order_details.id')}
              value={
                orderData?.providerOrderId
                  ? String(orderData.providerOrderId)
                  : ''
              }
              valueSelectable
            />
          </Row>
          {typeof date === 'string' && (
            <Row>
              <OrderDetailRow
                label={strings(
                  'fiat_on_ramp_aggregator.order_details.date_and_time',
                )}
                value={date}
              />
            </Row>
          )}
          {Boolean(orderData?.paymentMethod?.name) && (
            <OrderDetailRow
              label={strings(
                order.orderType === OrderOrderTypeEnum.Buy
                  ? 'fiat_on_ramp_aggregator.order_details.payment_method'
                  : 'fiat_on_ramp_aggregator.order_details.destination',
              )}
              value={orderData.paymentMethod.name}
            />
          )}
          {Boolean(order.provider) && (
            <KeyValueRow
              twClassName="h-auto"
              keyLabel=""
              value={
                <MmdsText
                  variant={MmdsTextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  style={styles.textRight}
                >
                  {providerName}
                  {supportLinkUrl ? (
                    <>
                      {' '}
                      •{' '}
                      <MmdsText
                        variant={MmdsTextVariant.BodyMd}
                        fontWeight={FontWeight.Medium}
                        style={styles.underline}
                        onPress={() =>
                          handleExplorerLinkPress(supportLinkUrl as string)
                        }
                      >
                        {strings(
                          'fiat_on_ramp_aggregator.order_details.contact_support',
                        )}
                      </MmdsText>
                    </>
                  ) : null}
                </MmdsText>
              }
            />
          )}
          <Row>
            <OrderDetailRow
              label={strings(
                order.orderType === OrderOrderTypeEnum.Buy
                  ? 'fiat_on_ramp_aggregator.order_details.token_amount'
                  : 'fiat_on_ramp_aggregator.order_details.token_quantity_sold',
              )}
              value={
                cryptoAmount &&
                orderData?.cryptoCurrency?.decimals !== undefined
                  ? `${renderFromTokenMinimalUnit(
                      toTokenMinimalUnit(
                        cryptoAmount,
                        orderData.cryptoCurrency.decimals,
                      ).toString(),
                      orderData.cryptoCurrency.decimals,
                    )} ${cryptocurrency}`
                  : '...'
              }
            />
          </Row>
          <Group>
            <Row>
              <OrderDetailRow
                label={strings(
                  'fiat_on_ramp_aggregator.order_details.exchange_rate',
                )}
                value={
                  order.cryptocurrency && isFinite(exchangeRate) && currency
                    ? `1 ${order.cryptocurrency} @ ${renderFiat(
                        exchangeRate,
                        currency,
                      )}`
                    : '...'
                }
              />
            </Row>
            <Row>
              <OrderDetailRow
                label={`${currency} ${strings(
                  order.orderType === OrderOrderTypeEnum.Buy
                    ? 'fiat_on_ramp_aggregator.order_details.amount'
                    : 'fiat_on_ramp_aggregator.order_details.value',
                )}`}
                value={
                  orderData?.fiatCurrency?.decimals !== undefined &&
                  amountOut &&
                  currency
                    ? `${currencySymbol ?? ''}${renderFiat(
                        order.orderType === OrderOrderTypeEnum.Buy
                          ? amountOut
                          : (amount as number),
                        currency,
                        orderData.fiatCurrency.decimals,
                      )}`
                    : '...'
                }
              />
            </Row>
          </Group>
          <Row>
            <OrderDetailRow
              label={strings(
                'fiat_on_ramp_aggregator.order_details.total_fees',
              )}
              value={
                cryptoFee &&
                currency &&
                orderData?.fiatCurrency?.decimals !== undefined
                  ? `${currencySymbol ?? ''}${renderFiat(
                      order.orderType === OrderOrderTypeEnum.Buy
                        ? (cryptoFee as number)
                        : orderData.totalFeesFiat,
                      currency,
                      orderData.fiatCurrency.decimals,
                    )}`
                  : '...'
              }
            />
          </Row>

          <View style={styles.line} />
          <Row>
            <OrderDetailRow
              label={strings(
                order.orderType === OrderOrderTypeEnum.Buy
                  ? 'fiat_on_ramp_aggregator.order_details.purchase_amount'
                  : 'fiat_on_ramp_aggregator.order_details.amount_received_total',
              )}
              value={
                currencySymbol &&
                amount &&
                currency &&
                orderData?.fiatCurrency?.decimals !== undefined
                  ? `${currencySymbol}${renderFiat(
                      order.orderType === OrderOrderTypeEnum.Buy
                        ? (amount as number)
                        : amountOut,
                      currency,
                      orderData.fiatCurrency.decimals,
                    )}`
                  : '...'
              }
            />
          </Row>
          {Boolean(order.state === OrderStatusEnum.Completed && txHash) && (
            <Group>
              <TouchableOpacity
                onPress={() => handleExplorerLinkPress(explorer.tx(txHash))}
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Primary}
                  style={styles.textCenter}
                >
                  {strings('fiat_on_ramp_aggregator.order_details.etherscan')}{' '}
                  {explorer.isValid
                    ? explorer.name
                    : strings(
                        'fiat_on_ramp_aggregator.order_details.a_block_explorer',
                      )}
                </Text>
              </TouchableOpacity>
            </Group>
          )}
        </Box>
      </Group>
    </View>
  );
};

export default OrderDetails;
