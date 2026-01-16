import React, { useCallback } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
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
} from '../../../../../util/number';
import { FiatOrder, getProviderName } from '../../../../../reducers/fiatOrders';
import { useLegacySwapsBlockExplorer } from '../../../Bridge/hooks/useLegacySwapsBlockExplorer';
import Spinner from '../../../AnimatedSpinner';
import useAnalytics from '../../hooks/useAnalytics';
import { PROVIDER_LINKS } from '../types';
import Account from './Account';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { getOrderAmount } from '../utils';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ListItemColumnEnd from './ListItemColumnEnd';

/* eslint-disable-next-line import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
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
      paddingBottom: 18,
    },
    transactionIdFlex: {
      textAlign: 'right',
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
    flexZero: {
      flex: 0,
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
    listItem: {
      paddingVertical: 0,
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
            <ListItem style={styles.listItem}>
              <ListItemColumn widthType={WidthType.Fill}>
                <Text variant={TextVariant.BodySM}>
                  {strings('fiat_on_ramp_aggregator.order_details.id')}
                </Text>
              </ListItemColumn>
              <ListItemColumn widthType={WidthType.Fill}>
                <Text
                  variant={TextVariant.BodySMBold}
                  selectable
                  style={styles.transactionIdFlex}
                >
                  {orderData?.providerOrderId}
                </Text>
              </ListItemColumn>
            </ListItem>
          </Row>
          {Boolean(date) && (
            <Row>
              <ListItem style={styles.listItem}>
                <ListItemColumn widthType={WidthType.Fill}>
                  <Text variant={TextVariant.BodySM}>
                    {strings(
                      'fiat_on_ramp_aggregator.order_details.date_and_time',
                    )}
                  </Text>
                </ListItemColumn>
                <ListItemColumn>
                  <Text variant={TextVariant.BodySMBold}>{date}</Text>
                </ListItemColumn>
              </ListItem>
            </Row>
          )}
          {Boolean(orderData?.paymentMethod?.name) && (
            <ListItem style={styles.listItem}>
              <ListItemColumn widthType={WidthType.Fill}>
                <Text variant={TextVariant.BodySM}>
                  {strings(
                    order.orderType === OrderOrderTypeEnum.Buy
                      ? 'fiat_on_ramp_aggregator.order_details.payment_method'
                      : 'fiat_on_ramp_aggregator.order_details.destination',
                  )}
                </Text>
              </ListItemColumn>
              <ListItemColumn>
                <Text variant={TextVariant.BodySMBold}>
                  {orderData.paymentMethod.name}
                </Text>
              </ListItemColumn>
            </ListItem>
          )}
          {Boolean(order.provider) && (
            <ListItem style={styles.listItem}>
              <ListItemColumnEnd widthType={WidthType.Fill}>
                <Text variant={TextVariant.BodySM}>
                  {providerName}
                  {supportLinkUrl ? (
                    <>
                      {' '}
                      •{' '}
                      <Text
                        variant={TextVariant.BodySM}
                        style={styles.underline}
                        onPress={() =>
                          handleExplorerLinkPress(supportLinkUrl as string)
                        }
                      >
                        {strings(
                          'fiat_on_ramp_aggregator.order_details.contact_support',
                        )}
                      </Text>
                    </>
                  ) : null}
                </Text>
              </ListItemColumnEnd>
            </ListItem>
          )}
          <Row>
            <ListItem style={styles.listItem}>
              <ListItemColumn widthType={WidthType.Fill}>
                <Text variant={TextVariant.BodySM}>
                  {strings(
                    order.orderType === OrderOrderTypeEnum.Buy
                      ? 'fiat_on_ramp_aggregator.order_details.token_amount'
                      : 'fiat_on_ramp_aggregator.order_details.token_quantity_sold',
                  )}
                </Text>
              </ListItemColumn>
              <ListItemColumn>
                {cryptoAmount &&
                orderData?.cryptoCurrency?.decimals !== undefined ? (
                  <Text variant={TextVariant.BodySMBold}>
                    {renderFromTokenMinimalUnit(
                      toTokenMinimalUnit(
                        cryptoAmount,
                        orderData.cryptoCurrency.decimals,
                      ).toString(),
                      orderData.cryptoCurrency.decimals,
                    )}{' '}
                    {cryptocurrency}
                  </Text>
                ) : (
                  <Text variant={TextVariant.BodySMBold}>...</Text>
                )}
              </ListItemColumn>
            </ListItem>
          </Row>
          <Group>
            <Row>
              <ListItem style={styles.listItem}>
                <ListItemColumn widthType={WidthType.Fill}>
                  <Text variant={TextVariant.BodySM}>
                    {strings(
                      'fiat_on_ramp_aggregator.order_details.exchange_rate',
                    )}
                  </Text>
                </ListItemColumn>
                <ListItemColumn style={styles.flexZero}>
                  {order.cryptocurrency &&
                  isFinite(exchangeRate) &&
                  currency ? (
                    <Text variant={TextVariant.BodySMBold}>
                      1 {order.cryptocurrency} @{' '}
                      {renderFiat(exchangeRate, currency)}
                    </Text>
                  ) : (
                    <Text variant={TextVariant.BodySMBold}>...</Text>
                  )}
                </ListItemColumn>
              </ListItem>
            </Row>
            <Row>
              <ListItem style={styles.listItem}>
                <ListItemColumn widthType={WidthType.Fill}>
                  <Text variant={TextVariant.BodySM}>
                    {currency}{' '}
                    {strings(
                      order.orderType === OrderOrderTypeEnum.Buy
                        ? 'fiat_on_ramp_aggregator.order_details.amount'
                        : 'fiat_on_ramp_aggregator.order_details.value',
                    )}
                  </Text>
                </ListItemColumn>
                <ListItemColumn>
                  {orderData?.fiatCurrency?.decimals !== undefined &&
                  amountOut &&
                  currency ? (
                    <Text variant={TextVariant.BodySMBold}>
                      {currencySymbol}
                      {renderFiat(
                        order.orderType === OrderOrderTypeEnum.Buy
                          ? amountOut
                          : (amount as number),
                        currency,
                        orderData.fiatCurrency.decimals,
                      )}
                    </Text>
                  ) : (
                    <Text variant={TextVariant.BodySMBold}>...</Text>
                  )}
                </ListItemColumn>
              </ListItem>
            </Row>
          </Group>
          <Row>
            <ListItem style={styles.listItem}>
              <ListItemColumn widthType={WidthType.Fill}>
                <Text variant={TextVariant.BodySM}>
                  {strings('fiat_on_ramp_aggregator.order_details.total_fees')}
                </Text>
              </ListItemColumn>
              <ListItemColumn>
                {cryptoFee &&
                currency &&
                orderData?.fiatCurrency?.decimals !== undefined ? (
                  <Text variant={TextVariant.BodySMBold}>
                    {currencySymbol}
                    {renderFiat(
                      order.orderType === OrderOrderTypeEnum.Buy
                        ? (cryptoFee as number)
                        : orderData.totalFeesFiat,
                      currency,
                      orderData.fiatCurrency.decimals,
                    )}
                  </Text>
                ) : (
                  <Text variant={TextVariant.BodySMBold}>...</Text>
                )}
              </ListItemColumn>
            </ListItem>
          </Row>

          <View style={styles.line} />
          <Row>
            <ListItem style={styles.listItem}>
              <ListItemColumn widthType={WidthType.Fill}>
                <Text variant={TextVariant.BodySM}>
                  {strings(
                    order.orderType === OrderOrderTypeEnum.Buy
                      ? 'fiat_on_ramp_aggregator.order_details.purchase_amount'
                      : 'fiat_on_ramp_aggregator.order_details.amount_received_total',
                  )}
                </Text>
              </ListItemColumn>
              <ListItemColumn>
                {currencySymbol &&
                amount &&
                currency &&
                orderData?.fiatCurrency?.decimals !== undefined ? (
                  <Text variant={TextVariant.BodySMBold}>
                    {currencySymbol}
                    {renderFiat(
                      order.orderType === OrderOrderTypeEnum.Buy
                        ? (amount as number)
                        : amountOut,
                      currency,
                      orderData.fiatCurrency.decimals,
                    )}
                  </Text>
                ) : (
                  <Text variant={TextVariant.BodySMBold}>...</Text>
                )}
              </ListItemColumn>
            </ListItem>
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
