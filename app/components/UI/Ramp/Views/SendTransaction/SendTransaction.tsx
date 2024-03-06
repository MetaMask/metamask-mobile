import React, { useCallback, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { BN } from 'ethereumjs-util';
import { SellOrder } from '@consensys/on-ramp-sdk/dist/API';
import { Transaction, WalletDevice } from '@metamask/transaction-controller';

import Row from '../../components/Row';
import ScreenLayout from '../../components/ScreenLayout';
import PaymentMethodIcon from '../../components/PaymentMethodIcon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import RemoteImage from '../../../../Base/RemoteImage';

import styleSheet from './SendTransaction.styles';
import imageIcons from '../../../../../images/image-icons';

import { RootState } from '../../../../../reducers';
import {
  getOrderById,
  getProviderName,
  setFiatSellTxHash,
} from '../../../../../reducers/fiatOrders';
import { getFiatOnRampAggNavbar } from '../../../Navbar';
import { useParams } from '../../../../../util/navigation/navUtils';
import {
  addHexPrefix,
  fromTokenMinimalUnitString,
  toTokenMinimalUnit,
} from '../../../../../util/number';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { addTransaction } from '../../../../../util/transaction-controller';

import { NATIVE_ADDRESS } from '../../../../../constants/on-ramp';
import { safeToChecksumAddress } from '../../../../../util/address';
import { generateTransferData } from '../../../../../util/transactions';
import useAnalytics from '../../hooks/useAnalytics';
import { toHex } from '@metamask/controller-utils';

interface SendTransactionParams {
  orderId?: string;
}

function SendTransaction() {
  const navigation = useNavigation();
  const params = useParams<SendTransactionParams>();
  const dispatch = useDispatch();
  const order = useSelector((state: RootState) =>
    getOrderById(state, params.orderId),
  );
  const trackEvent = useAnalytics();

  const {
    styles,
    theme: { colors, themeAppearance },
  } = useStyles(styleSheet, {});

  const orderData = order?.data as SellOrder;

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings(
            'fiat_on_ramp_aggregator.send_transaction.sell_crypto',
          ),
          showCancel: false,
        },
        colors,
      ),
    );
  }, [colors, navigation]);

  const transactionAnalyticsPayload = useMemo(
    () => ({
      crypto_amount: orderData?.cryptoAmount as string,
      chain_id_source: orderData?.cryptoCurrency.network.chainId,
      fiat_out: orderData?.fiatAmount,
      payment_method_id: orderData?.paymentMethod.id,
      currency_source: orderData?.cryptoCurrency.symbol,
      currency_destination: orderData?.fiatCurrency.symbol,
      order_id: order?.id,
      provider_offramp: orderData?.provider.name,
    }),
    [order?.id, orderData],
  );

  useEffect(() => {
    trackEvent(
      'OFFRAMP_SEND_CRYPTO_PROMPT_VIEWED',
      transactionAnalyticsPayload,
    );
  }, [trackEvent, transactionAnalyticsPayload]);

  const handleSend = useCallback(async () => {
    let transactionParams: Transaction;
    const amount = addHexPrefix(
      new BN(
        toTokenMinimalUnit(
          orderData.cryptoAmount || '0',
          orderData.cryptoCurrency.decimals,
        ).toString(),
      ).toString('hex'),
    );
    if (orderData.cryptoCurrency.address === NATIVE_ADDRESS) {
      transactionParams = {
        from: safeToChecksumAddress(orderData.walletAddress) as string,
        to: safeToChecksumAddress(orderData.depositWallet),
        value: amount,
        chainId: toHex(orderData.cryptoCurrency.network.chainId),
      };
    } else {
      transactionParams = {
        from: safeToChecksumAddress(orderData.walletAddress) as string,
        to: safeToChecksumAddress(orderData.cryptoCurrency.address),
        value: '0x0',
        data: generateTransferData('transfer', {
          toAddress: safeToChecksumAddress(orderData.depositWallet),
          amount,
        }),
      };
    }

    try {
      trackEvent(
        'OFFRAMP_SEND_TRANSACTION_INVOKED',
        transactionAnalyticsPayload,
      );
      const response = await addTransaction(transactionParams, {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
      });
      const hash = await response.result;

      if (order?.id) {
        dispatch(setFiatSellTxHash(order.id, hash));
        navigation.goBack();
        trackEvent(
          'OFFRAMP_SEND_TRANSACTION_CONFIRMED',
          transactionAnalyticsPayload,
        );
      }
    } catch (error) {
      trackEvent(
        'OFFRAMP_SEND_TRANSACTION_REJECTED',
        transactionAnalyticsPayload,
      );
    }
  }, [
    navigation,
    dispatch,
    order?.id,
    orderData,
    trackEvent,
    transactionAnalyticsPayload,
  ]);

  if (!order) {
    return null;
  }

  let tokenIcon;
  const symbol = orderData.cryptoCurrency.symbol;
  if (symbol === 'ETH') {
    tokenIcon = imageIcons.ETHEREUM;
  } else if (Object.keys(imageIcons).includes(symbol)) {
    tokenIcon = imageIcons[symbol as keyof typeof imageIcons];
  } else {
    tokenIcon = { uri: orderData.cryptoCurrency.logo };
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <View style={styles.content}>
            <Row>
              <Text style={styles.centered}>
                <Text variant={TextVariant.HeadingMD} style={styles.normal}>
                  {strings('fiat_on_ramp_aggregator.send_transaction.send')}{' '}
                </Text>
                <Text variant={TextVariant.HeadingMD}>
                  {fromTokenMinimalUnitString(
                    toTokenMinimalUnit(
                      order.cryptoAmount || '0',
                      orderData.cryptoCurrency.decimals,
                    ).toString(),
                    orderData.cryptoCurrency.decimals,
                  )}{' '}
                </Text>
                <Avatar
                  size={AvatarSize.Sm}
                  variant={AvatarVariant.Token}
                  name={order.cryptocurrency}
                  imageSource={tokenIcon}
                />{' '}
                <Text variant={TextVariant.HeadingMD}>
                  {order.cryptocurrency}
                </Text>
              </Text>
            </Row>

            <Row>
              <Icon
                name={IconName.Arrow2Down}
                size={IconSize.Lg}
                color={IconColor.Alternative}
              />
            </Row>

            <Row>
              {orderData.provider?.logos?.[themeAppearance] ? (
                <RemoteImage
                  style={{
                    width: orderData.provider.logos.width,
                    height: orderData.provider.logos.height,
                  }}
                  source={{ uri: orderData.provider.logos[themeAppearance] }}
                />
              ) : (
                <Text variant={TextVariant.BodyMDBold}>
                  {orderData.provider.name}
                </Text>
              )}
            </Row>
            {orderData.paymentMethod?.customAction ? null : (
              <>
                <Row>
                  <Icon
                    name={IconName.Arrow2Down}
                    size={IconSize.Lg}
                    color={IconColor.Alternative}
                  />
                </Row>

                <Row>
                  <View style={styles.paymentMethodDestination}>
                    <PaymentMethodIcon
                      paymentMethodIcons={orderData.paymentMethod.icons}
                      paymentMethodType={orderData.paymentMethod.paymentType}
                      size={20}
                      color={colors.icon.alternative}
                    />
                    <Text variant={TextVariant.HeadingMD} style={styles.normal}>
                      {orderData.paymentMethod.name}
                    </Text>
                  </View>
                </Row>
              </>
            )}
          </View>
          {/*<Row last><TransactionReview order={order} /></Row> */}
        </ScreenLayout.Content>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <Row first>
            <Text style={styles.centered} variant={TextVariant.BodyMD}>
              {strings(
                'fiat_on_ramp_aggregator.send_transaction.send_description',
                {
                  cryptocurrency: order?.cryptocurrency,
                  provider: getProviderName(order.provider, order?.data),
                  paymentMethod: orderData.paymentMethod.name,
                },
              )}
            </Text>
          </Row>

          <Row>
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              onPress={handleSend}
              accessibilityRole="button"
              accessible
              label={
                <Text
                  variant={TextVariant.BodyLGMedium}
                  color={TextColor.Inverse}
                >
                  {strings('fiat_on_ramp_aggregator.send_transaction.next')}
                </Text>
              }
            />
          </Row>
          {/* <Row>
            <ButtonConfirm onLongPress={handleSend} disabled={isLoadingGas} />
          </Row> */}
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
}

export default SendTransaction;
