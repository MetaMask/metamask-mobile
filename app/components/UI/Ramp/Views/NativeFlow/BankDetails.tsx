import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, RefreshControl } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useDispatch, useSelector } from 'react-redux';
import styleSheet from '../../Deposit/Views/BankDetails/BankDetails.styles';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useParams } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../component-library/hooks';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../Navbar';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Loader from '../../../../../component-library/components-temp/Loader/Loader';
import BankDetailRow from '../../Deposit/components/BankDetailRow';
import {
  FiatOrder,
  getOrderById,
  updateFiatOrder,
} from '../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { useTheme } from '../../../../../util/theme';
import { RootState } from '../../../../../reducers';
import { hasDepositOrderField } from '../../Deposit/utils';
import { depositOrderToFiatOrder } from '../../Deposit/orderProcessor';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import PrivacySection from '../../Deposit/components/PrivacySection';
import useAnalytics from '../../hooks/useAnalytics';
import { isString } from 'lodash';
import Logger from '../../../../../util/Logger';
import { useTransakController } from '../../hooks/useTransakController';
import { selectTokens } from '../../../../../selectors/rampsController';

export interface BankDetailsParams {
  orderId: string;
  shouldUpdate?: boolean;
}

const V2BankDetails = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const {
    userRegion,
    logoutFromProvider,
    getOrder,
    confirmPayment,
    cancelOrder: transakCancelOrder,
  } = useTransakController();
  const tokensResource = useSelector(selectTokens);
  const selectedCryptoCurrency = tokensResource?.selected;
  const trackEvent = useAnalytics();

  const regionIsoCode = userRegion?.country?.isoCode || '';

  const { orderId, shouldUpdate = true } = useParams<BankDetailsParams>();
  const order = useSelector((state: RootState) => getOrderById(state, orderId));

  const [showBankInfo, setShowBankInfo] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [cancelOrderError, setCancelOrderError] = useState<Error | null>(null);
  const [isLoadingCancelOrder, setIsLoadingCancelOrder] = useState(false);

  const [confirmPaymentError, setConfirmPaymentError] = useState<string | null>(
    null,
  );
  const [isLoadingConfirmPayment, setIsLoadingConfirmPayment] = useState(false);

  const dispatchUpdateFiatOrder = useCallback(
    (updatedOrder: FiatOrder) => {
      dispatch(updateFiatOrder(updatedOrder));
    },
    [dispatch],
  );

  const handleLogoutError = useCallback(async () => {
    try {
      await logoutFromProvider(false);
      navigation.navigate(Routes.RAMP.AMOUNT_INPUT as never);
    } catch (logoutError) {
      Logger.error(logoutError as Error, 'V2BankDetails: handleLogoutError');
    }
  }, [logoutFromProvider, navigation]);

  const handleOnRefresh = useCallback(async () => {
    if (!order) return;

    try {
      setIsRefreshing(true);
      const updatedDepositOrder = await getOrder(order.id, order.account);
      if (updatedDepositOrder) {
        const updatedFiatOrder = depositOrderToFiatOrder(
          updatedDepositOrder as Parameters<typeof depositOrderToFiatOrder>[0],
        );
        dispatchUpdateFiatOrder({
          ...updatedFiatOrder,
          account: order.account,
          lastTimeFetched: Date.now(),
          errorCount: 0,
          forceUpdate: false,
        });
      }
    } catch (refreshError) {
      const httpError = refreshError as { status?: number };
      if (httpError.status === 401) {
        await handleLogoutError();
        return;
      }
      Logger.error(refreshError as Error, 'V2BankDetails: handleOnRefresh');
    } finally {
      setIsRefreshing(false);
    }
  }, [order, getOrder, dispatchUpdateFiatOrder, handleLogoutError]);

  useEffect(() => {
    if (order?.state === FIAT_ORDER_STATES.CREATED && shouldUpdate) {
      handleOnRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!order?.state) return;
    if (order.state === FIAT_ORDER_STATES.CANCELLED) {
      navigation.navigate(Routes.RAMP.AMOUNT_INPUT as never);
    } else if (
      order.state === FIAT_ORDER_STATES.PENDING ||
      order.state === FIAT_ORDER_STATES.COMPLETED ||
      order.state === FIAT_ORDER_STATES.FAILED
    ) {
      navigation.dispatch(
        StackActions.replace(Routes.RAMP.ORDER_PROCESSING, {
          orderId: order.id,
        }),
      );
    }
  }, [order?.state, navigation, order?.id]);

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
      if (!hasDepositOrderField(order?.data, 'paymentDetails')) return null;

      if (!order.data.paymentDetails || order.data.paymentDetails.length === 0)
        return null;

      const field = order.data.paymentDetails[0].fields.find(
        (f) => f.name === fieldName,
      );
      if (!field?.value) return null;

      return capitalizeWords(field.value);
    },
    [order, capitalizeWords],
  );

  const amount = getFieldValue('Amount');
  const firstName = getFieldValue('First Name (Beneficiary)');
  const lastName = getFieldValue('Last Name (Beneficiary)');
  const accountName =
    firstName || lastName
      ? `${firstName ?? ''} ${lastName ?? ''}`.trim()
      : null;
  const accountType = getFieldValue('Account Type');
  const bankName = getFieldValue('Bank Name');
  const beneficiaryAddress = getFieldValue('Recipient Address');
  const bankAddress = getFieldValue('Bank Address');
  const routingNumber = getFieldValue('Routing Number');
  const accountNumber = getFieldValue('Account Number');
  const iban = getFieldValue('IBAN');
  const bic = getFieldValue('BIC');

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        {
          title: strings('deposit.bank_details.navbar_title', {
            paymentMethod: hasDepositOrderField(order?.data, 'paymentMethod')
              ? order.data.paymentMethod?.shortName
              : '',
          }),
        },
        theme,
      ),
    );
  }, [navigation, theme, order?.data]);

  const handleBankTransferSent = useCallback(async () => {
    setCancelOrderError(null);
    if (isLoadingConfirmPayment || !order) return;
    try {
      setIsLoadingConfirmPayment(true);
      if (
        !hasDepositOrderField(order?.data, 'paymentMethod') ||
        !order.data.paymentMethod.id
      ) {
        Logger.error(
          new Error('Payment method not found or empty'),
          'V2BankDetails: handleBankTransferSent',
        );
        return;
      }

      const paymentMethodId = order.data.paymentMethod.id;
      await confirmPayment(order.id, paymentMethodId);

      trackEvent('RAMPS_TRANSACTION_CONFIRMED', {
        ramp_type: 'DEPOSIT',
        amount_source: Number(order.data.fiatAmount),
        amount_destination: Number(order.cryptoAmount),
        exchange_rate: Number(order.data.exchangeRate),
        gas_fee: 0,
        processing_fee: 0,
        total_fee: Number(order.data.totalFeesFiat),
        payment_method_id: paymentMethodId,
        country: regionIsoCode,
        chain_id: selectedCryptoCurrency?.chainId || '',
        currency_destination: selectedCryptoCurrency?.assetId || '',
        currency_source: order.data.fiatCurrency,
      });

      await handleOnRefresh();
    } catch (fetchError) {
      const httpError = fetchError as { status?: number };
      if (httpError.status === 401) {
        await handleLogoutError();
        return;
      }
      Logger.error(
        fetchError as Error,
        'V2BankDetails: handleBankTransferSent',
      );
      if (isString(fetchError)) {
        setConfirmPaymentError(fetchError);
      } else if (isString((fetchError as Error)?.message)) {
        setConfirmPaymentError((fetchError as Error).message);
      } else {
        setConfirmPaymentError(strings('deposit.bank_details.error_message'));
      }
    } finally {
      setIsLoadingConfirmPayment(false);
    }
  }, [
    isLoadingConfirmPayment,
    order,
    trackEvent,
    regionIsoCode,
    selectedCryptoCurrency?.assetId,
    selectedCryptoCurrency?.chainId,
    confirmPayment,
    handleOnRefresh,
    handleLogoutError,
  ]);

  const handleCancelOrder = useCallback(async () => {
    setConfirmPaymentError(null);
    if (isLoadingCancelOrder || !order) return;
    try {
      setIsLoadingCancelOrder(true);
      await transakCancelOrder(order.id);
      await handleOnRefresh();
    } catch (fetchError) {
      const httpError = fetchError as { status?: number };
      if (httpError.status === 401) {
        await handleLogoutError();
        return;
      }
      Logger.error(fetchError as Error, 'V2BankDetails: handleCancelOrder');
      setCancelOrderError(fetchError as Error);
    } finally {
      setIsLoadingCancelOrder(false);
    }
  }, [
    transakCancelOrder,
    handleOnRefresh,
    isLoadingCancelOrder,
    handleLogoutError,
    order,
  ]);

  const toggleBankInfo = useCallback(() => {
    setShowBankInfo(!showBankInfo);
  }, [showBankInfo]);

  return (
    <ScreenLayout>
      <ScrollView
        testID="bank-details-refresh-control-scrollview"
        refreshControl={
          <RefreshControl
            colors={[colors.primary.default]}
            tintColor={colors.icon.default}
            refreshing={isRefreshing}
            onRefresh={handleOnRefresh}
          />
        }
      >
        <ScreenLayout.Body>
          <ScreenLayout.Content style={styles.content}>
            <View style={styles.mainSection}>
              <Text variant={TextVariant.HeadingMD}>
                {strings('deposit.bank_details.main_title')}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('deposit.bank_details.main_content_1')}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('deposit.bank_details.main_content_2')}
              </Text>
            </View>

            {order ? (
              <View style={styles.detailsContainer}>
                {amount ? (
                  <BankDetailRow
                    label={strings('deposit.bank_details.transfer_amount')}
                    value={amount}
                  />
                ) : null}

                {accountName ? (
                  <BankDetailRow
                    label={strings('deposit.bank_details.account_holder_name')}
                    value={accountName}
                  />
                ) : null}

                {routingNumber ? (
                  <BankDetailRow
                    label={strings('deposit.bank_details.routing_number')}
                    value={routingNumber}
                  />
                ) : null}

                {accountNumber ? (
                  <BankDetailRow
                    label={strings('deposit.bank_details.account_number')}
                    value={accountNumber}
                  />
                ) : null}

                {iban ? (
                  <BankDetailRow
                    label={strings('deposit.bank_details.iban')}
                    value={iban}
                  />
                ) : null}

                {bic ? (
                  <BankDetailRow
                    label={strings('deposit.bank_details.bic')}
                    value={bic}
                  />
                ) : null}

                {accountType ? (
                  <BankDetailRow
                    label={strings('deposit.bank_details.account_type')}
                    value={accountType}
                  />
                ) : null}

                {showBankInfo ? (
                  <>
                    {bankName ? (
                      <BankDetailRow
                        label={strings('deposit.bank_details.bank_name')}
                        value={bankName}
                      />
                    ) : null}

                    {beneficiaryAddress ? (
                      <BankDetailRow
                        label={strings(
                          'deposit.bank_details.beneficiary_address',
                        )}
                        value={beneficiaryAddress}
                      />
                    ) : null}

                    {bankAddress ? (
                      <BankDetailRow
                        label={strings('deposit.bank_details.bank_address')}
                        value={bankAddress}
                      />
                    ) : null}
                  </>
                ) : null}

                <TouchableOpacity
                  style={styles.showBankInfoButton}
                  onPress={toggleBankInfo}
                >
                  <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
                    {showBankInfo
                      ? strings('deposit.bank_details.hide_bank_info')
                      : strings('deposit.bank_details.show_bank_info')}
                  </Text>
                  <Icon
                    name={showBankInfo ? IconName.ArrowUp : IconName.ArrowDown}
                    size={IconSize.Sm}
                    color={theme.colors.primary.default}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <Loader size="large" color={theme.colors.primary.default} />
            )}
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScrollView>

      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <View style={styles.bottomContainer}>
            {confirmPaymentError ? (
              <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                {confirmPaymentError ||
                  strings('deposit.bank_details.error_message')}
              </Text>
            ) : null}
            {cancelOrderError ? (
              <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                {strings('deposit.bank_details.cancel_order_error')}
              </Text>
            ) : null}

            <PrivacySection>
              <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
                {strings('deposit.bank_details.info_banner_text', {
                  accountHolderName: accountName,
                })}
              </Text>
            </PrivacySection>

            <View style={styles.buttonContainer}>
              <Button
                style={styles.button}
                variant={ButtonVariants.Secondary}
                onPress={handleCancelOrder}
                label={strings('deposit.order_processing.cancel_order_button')}
                size={ButtonSize.Lg}
                loading={isLoadingCancelOrder}
                disabled={isLoadingConfirmPayment}
              />

              <Button
                style={styles.button}
                variant={ButtonVariants.Primary}
                onPress={handleBankTransferSent}
                testID="main-action-button"
                label={strings('deposit.bank_details.button')}
                size={ButtonSize.Lg}
                disabled={isLoadingCancelOrder}
                loading={isLoadingConfirmPayment}
              />
            </View>
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default V2BankDetails;
