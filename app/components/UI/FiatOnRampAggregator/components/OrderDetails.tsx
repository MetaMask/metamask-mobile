import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Order, OrderStatusEnum } from '@consensys/on-ramp-sdk';
import Box from './Box';
import CustomText from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import { toDateFormat } from '../../../../util/date';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import {
  renderFiat,
  renderFromTokenMinimalUnit,
  toTokenMinimalUnit,
} from '../../../../util/number';
import { getProviderName } from '../../../../reducers/fiatOrders';
import useBlockExplorer from '../../Swaps/utils/useBlockExplorer';
import Spinner from '../../AnimatedSpinner';
import useAnalytics from '../hooks/useAnalytics';
import { FiatOrder } from '../../FiatOrders';
import { PROVIDER_LINKS } from '../types';
/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const failedIcon = require('./images/TransactionIcon_Failed.png');
// TODO: Convert into typescript and correctly type optionals
const Text = CustomText as any;
const ListItem = BaseListItem as any;

const createStyles = (colors: any) =>
  StyleSheet.create({
    stage: {
      alignItems: 'center',
    },
    provider: {
      alignSelf: 'flex-end',
      marginTop: 0,
    },
    listItems: {
      paddingVertical: 4,
    },
    seperationBottom: {
      paddingVertical: 4,
      paddingBottom: 18,
    },
    seperationTop: {
      paddingVertical: 4,
      paddingTop: 18,
    },
    transactionIdFlex: {
      flex: 1,
    },
    transactionTitle: {
      marginBottom: 8,
    },
    line: {
      backgroundColor: colors.border.muted,
      height: 1,
      marginVertical: 12,
    },
    link: {
      paddingTop: 10,
    },
    fiatColor: {
      paddingBottom: 12,
    },
    tokenAmount: {
      fontSize: 24,
    },
    stageDescription: {
      paddingBottom: 5,
      paddingTop: 10,
    },
    stageMessage: {
      paddingBottom: 4,
    },
    contactDesc: {
      flexDirection: 'row',
      alignSelf: 'center',
      paddingTop: 15,
    },
    flexZero: {
      flex: 0,
    },
  });

interface PropsStage {
  stage: string;
  paymentType?: string;
  cryptocurrency?: string;
  providerName?: string;
}

const Stage: React.FC<PropsStage> = ({
  stage,
  paymentType,
  cryptocurrency,
  providerName,
}: PropsStage) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  switch (stage) {
    case OrderStatusEnum.Completed: {
      return (
        <>
          <Feather
            name="check-circle"
            size={32}
            color={colors.success.default}
          />
          <Text bold big primary centered style={styles.stageDescription}>
            {strings('fiat_on_ramp_aggregator.order_details.successful')}
          </Text>
          <Text small centered style={styles.stageMessage}>
            {strings('fiat_on_ramp_aggregator.order_details.your')}{' '}
            {cryptocurrency ||
              strings('fiat_on_ramp_aggregator.order_details.crypto')}{' '}
            {strings(
              'fiat_on_ramp_aggregator.order_details.available_in_account',
            )}
          </Text>
        </>
      );
    }
    case OrderStatusEnum.Cancelled:
    case OrderStatusEnum.Failed: {
      return (
        <>
          <Image source={failedIcon} />
          <Text bold big primary centered style={styles.stageDescription}>
            {stage === 'FAILED'
              ? strings('fiat_on_ramp_aggregator.order_details.failed')
              : 'fiat_on_ramp.cancelled'}
          </Text>
          <Text small centered style={styles.stageMessage}>
            {strings(
              'fiat_on_ramp_aggregator.order_details.failed_description',
              {
                provider:
                  providerName ||
                  strings('fiat_on_ramp_aggregator.order_details.the_provider'),
              },
            )}
          </Text>
        </>
      );
    }
    case OrderStatusEnum.Pending:
    case OrderStatusEnum.Unknown:
    default: {
      return (
        <>
          <Spinner />
          <Text bold big primary centered style={styles.stageDescription}>
            {stage === 'PENDING'
              ? strings('fiat_on_ramp_aggregator.order_details.processing')
              : strings('transaction.submitted')}
          </Text>
          {!paymentType?.includes('Credit') ? (
            <Text small centered style={styles.stageMessage}>
              {strings(
                'fiat_on_ramp_aggregator.order_details.processing_bank_description',
              )}
            </Text>
          ) : (
            <Text small centered style={styles.stageMessage}>
              {strings(
                'fiat_on_ramp_aggregator.order_details.processing_card_description',
              )}
            </Text>
          )}
        </>
      );
    }
  }
};

interface Props {
  /**
   * Object that represents the current route info like params passed to it
   */
  order: FiatOrder;
  /**
   * Current Network provider
   */
  provider: any;
  /**
   * Frequent RPC list from PreferencesController
   */
  frequentRpcList: any;
}

const OrderDetails: React.FC<Props> = ({
  order,
  provider,
  frequentRpcList,
}: Props) => {
  const {
    data,
    state,
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
  const explorer = useBlockExplorer(provider, frequentRpcList);
  const styles = createStyles(colors);
  const date = toDateFormat(createdAt);
  const amountOut = Number(amount) - Number(cryptoFee);
  const exchangeRate = Number(amountOut) / Number(cryptoAmount);
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

  return (
    <View>
      <View style={styles.stage}>
        <Stage
          stage={state}
          paymentType={orderData?.paymentMethod?.name}
          cryptocurrency={cryptocurrency}
          providerName={providerName}
        />
      </View>
      <Text centered primary style={styles.tokenAmount}>
        {orderData?.cryptoCurrency?.decimals &&
        cryptoAmount &&
        cryptoAmount !== 0 &&
        cryptocurrency ? (
          renderFromTokenMinimalUnit(
            toTokenMinimalUnit(
              cryptoAmount,
              orderData?.cryptoCurrency?.decimals,
            ).toString(),
            orderData?.cryptoCurrency?.decimals,
          )
        ) : (
          <Text>...</Text>
        )}{' '}
        {cryptocurrency}
      </Text>
      {orderData?.fiatCurrency?.decimals && currencySymbol ? (
        <Text centered small style={styles.fiatColor}>
          {currencySymbol}
          {renderFiat(amountOut, currency, orderData?.fiatCurrency?.decimals)}
        </Text>
      ) : (
        <Text>...</Text>
      )}
      <Box>
        <Text bold primary style={styles.transactionTitle}>
          {strings('fiat_on_ramp_aggregator.order_details.details')}
        </Text>
        <View>
          <ListItem.Content style={styles.listItems}>
            <ListItem.Body style={styles.transactionIdFlex}>
              <Text black small>
                {strings('fiat_on_ramp_aggregator.order_details.id')}
              </Text>
            </ListItem.Body>
            <ListItem.Amounts style={styles.transactionIdFlex}>
              <Text small bold primary right selectable>
                {orderData?.providerOrderId}
              </Text>
            </ListItem.Amounts>
          </ListItem.Content>
          <ListItem.Content style={styles.listItems}>
            <ListItem.Body>
              <Text black small>
                {strings('fiat_on_ramp_aggregator.order_details.date_and_time')}
              </Text>
            </ListItem.Body>
            <ListItem.Amounts>
              <Text small bold primary>
                {date}
              </Text>
            </ListItem.Amounts>
          </ListItem.Content>
          {orderData?.paymentMethod?.name && (
            <ListItem.Content style={styles.listItems}>
              <ListItem.Body>
                <Text black small>
                  {strings(
                    'fiat_on_ramp_aggregator.order_details.payment_method',
                  )}
                </Text>
              </ListItem.Body>
              <ListItem.Amounts>
                <Text small bold primary>
                  {orderData?.paymentMethod?.name}
                </Text>
              </ListItem.Amounts>
            </ListItem.Content>
          )}
          {order.provider && orderData?.paymentMethod?.name && (
            <Text small style={styles.provider}>
              {strings('fiat_on_ramp_aggregator.order_details.via')}{' '}
              {providerName}
            </Text>
          )}
          <ListItem.Content style={styles.seperationTop}>
            <ListItem.Body>
              <Text black small>
                {strings('fiat_on_ramp_aggregator.order_details.token_amount')}
              </Text>
            </ListItem.Body>
            <ListItem.Amounts>
              {cryptoAmount && orderData?.cryptoCurrency?.decimals ? (
                <Text small bold primary>
                  {renderFromTokenMinimalUnit(
                    toTokenMinimalUnit(
                      cryptoAmount,
                      orderData?.cryptoCurrency?.decimals,
                    ).toString(),
                    orderData?.cryptoCurrency?.decimals,
                  )}{' '}
                  {cryptocurrency}
                </Text>
              ) : (
                <Text>...</Text>
              )}
            </ListItem.Amounts>
          </ListItem.Content>
          <ListItem.Content style={styles.seperationBottom}>
            <ListItem.Body>
              <Text black small>
                {strings('fiat_on_ramp_aggregator.order_details.exchange_rate')}
              </Text>
            </ListItem.Body>
            <ListItem.Amounts style={styles.flexZero}>
              {order.cryptocurrency &&
              isFinite(exchangeRate) &&
              currency &&
              orderData?.fiatCurrency?.decimals ? (
                <Text small bold primary>
                  1 {order.cryptocurrency} @{' '}
                  {renderFiat(
                    exchangeRate,
                    currency,
                    orderData?.fiatCurrency?.decimals,
                  )}
                </Text>
              ) : (
                <Text>...</Text>
              )}
            </ListItem.Amounts>
          </ListItem.Content>

          <ListItem.Content style={styles.listItems}>
            <ListItem.Body>
              <Text black small>
                {currency}{' '}
                {strings('fiat_on_ramp_aggregator.order_details.amount')}
              </Text>
            </ListItem.Body>
            <ListItem.Amounts>
              {orderData?.fiatCurrency?.decimals && amountOut && currency ? (
                <Text small bold primary>
                  {currencySymbol}
                  {renderFiat(
                    amountOut,
                    currency,
                    orderData?.fiatCurrency?.decimals,
                  )}
                </Text>
              ) : (
                <Text>...</Text>
              )}
            </ListItem.Amounts>
          </ListItem.Content>
          <ListItem.Content style={styles.listItems}>
            <ListItem.Body>
              <Text black small>
                {strings('fiat_on_ramp_aggregator.order_details.total_fees')}
              </Text>
            </ListItem.Body>
            <ListItem.Amounts>
              {cryptoFee && currency && orderData?.fiatCurrency?.decimals ? (
                <Text small bold primary>
                  {currencySymbol}
                  {renderFiat(
                    cryptoFee as number,
                    currency,
                    orderData?.fiatCurrency?.decimals,
                  )}
                </Text>
              ) : (
                <Text>...</Text>
              )}
            </ListItem.Amounts>
          </ListItem.Content>
        </View>

        <View style={styles.line} />

        <ListItem.Content style={styles.listItems}>
          <ListItem.Body>
            <Text black small>
              {strings('fiat_on_ramp_aggregator.order_details.purchase_amount')}
            </Text>
          </ListItem.Body>
          <ListItem.Amounts>
            {currencySymbol &&
            amount &&
            currency &&
            orderData?.fiatCurrency?.decimals ? (
              <Text small bold primary>
                {currencySymbol}
                {renderFiat(
                  amount as number,
                  currency,
                  orderData?.fiatCurrency?.decimals,
                )}
              </Text>
            ) : (
              <Text>...</Text>
            )}
          </ListItem.Amounts>
        </ListItem.Content>
        {order.state === OrderStatusEnum.Completed && txHash && (
          <TouchableOpacity
            onPress={() => handleExplorerLinkPress(explorer.tx(txHash))}
          >
            <Text blue small centered style={styles.link}>
              {strings('fiat_on_ramp_aggregator.order_details.etherscan')}{' '}
              {explorer.isValid
                ? explorer.name
                : strings(
                    'fiat_on_ramp_aggregator.order_details.a_block_explorer',
                  )}
            </Text>
          </TouchableOpacity>
        )}
      </Box>
      {Boolean(supportLinkUrl) && (
        <View style={styles.contactDesc}>
          <Text small>
            {strings('fiat_on_ramp_aggregator.order_details.questions')}{' '}
          </Text>
          <TouchableOpacity
            onPress={() => handleProviderLinkPress(supportLinkUrl as string)}
          >
            {order.provider && data && (
              <Text small underline>
                {strings('fiat_on_ramp_aggregator.order_details.contact')}{' '}
                {providerName}{' '}
                {strings('fiat_on_ramp_aggregator.order_details.support')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default OrderDetails;
