import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, RefreshControl } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useDispatch, useSelector } from 'react-redux';
import styleSheet from './BankDetails.styles';
import { StackActions, useNavigation } from '@react-navigation/native';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../../component-library/hooks';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { createOrderProcessingNavDetails } from '../OrderProcessing/OrderProcessing';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Loader from '../../../../../../component-library/components-temp/Loader/Loader';
import BankDetailRow from '../../components/BankDetailRow';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import useThunkDispatch from '../../../../../hooks/useThunkDispatch';
import { endTrace, TraceName } from '../../../../../../util/trace';
import {
  FiatOrder,
  getOrderById,
  updateFiatOrder,
} from '../../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';
import { processFiatOrder } from '../../../index';
import { useTheme } from '../../../../../../util/theme';
import { RootState } from '../../../../../../reducers';
import {
  getCryptoCurrencyFromTransakId,
  getPaymentMethodByTransakId,
  hasDepositOrderField,
} from '../../utils';
import { useDepositSDK } from '../../sdk';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import PrivacySection from '../../components/PrivacySection';
import useAnalytics from '../../../hooks/useAnalytics';
import { isString } from 'lodash';
import Logger from '../../../../../../util/Logger';

export interface BankDetailsParams {
  orderId: string;
  shouldUpdate?: boolean;
}

export const createBankDetailsNavDetails =
  createNavigationDetails<BankDetailsParams>(Routes.DEPOSIT.BANK_DETAILS);

const BankDetails = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const dispatchThunk = useThunkDispatch();
  const { sdk, selectedRegion } = useDepositSDK();
  const trackEvent = useAnalytics();

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

  const [, confirmPayment] = useDepositSdkMethod({
    method: 'confirmPayment',
    onMount: false,
    throws: true,
  });

  const [, cancelOrder] = useDepositSdkMethod(
    {
      method: 'cancelOrder',
      onMount: false,
      throws: true,
    },
    orderId,
  );

  const dispatchUpdateFiatOrder = useCallback(
    (updatedOrder: FiatOrder) => {
      dispatch(updateFiatOrder(updatedOrder));
    },
    [dispatch],
  );

  const handleOnRefresh = useCallback(async () => {
    if (!order) return;

    try {
      setIsRefreshing(true);
      await processFiatOrder(order, dispatchUpdateFiatOrder, dispatchThunk, {
        forced: true,
        sdk,
      });
    } catch (error) {
      Logger.error(error as Error, 'BankDetails: handleOnRefresh');
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatchThunk, dispatchUpdateFiatOrder, order, sdk]);

  useEffect(() => {
    if (order?.state === FIAT_ORDER_STATES.CREATED && shouldUpdate) {
      handleOnRefresh();
    }
    // only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!order?.state) return;
    if (order.state === FIAT_ORDER_STATES.CANCELLED) {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: Routes.DEPOSIT.BUILD_QUOTE,
          },
        ],
      });
    } else if (
      order.state === FIAT_ORDER_STATES.PENDING ||
      order.state === FIAT_ORDER_STATES.COMPLETED ||
      order.state === FIAT_ORDER_STATES.FAILED
    ) {
      navigation.dispatch(
        StackActions.replace(
          ...createOrderProcessingNavDetails({
            orderId: order.id,
          }),
        ),
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
      if (!hasDepositOrderField(order?.data, 'paymentOptions')) return null;

      if (!order.data.paymentOptions || order.data.paymentOptions.length === 0)
        return null;

      const field = order.data.paymentOptions[0].fields.find(
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
    const paymentMethod =
      hasDepositOrderField(order?.data, 'paymentMethod') &&
      order?.data.paymentMethod
        ? getPaymentMethodByTransakId(order.data.paymentMethod)
        : null;
    const paymentMethodName = paymentMethod?.shortName ?? '';

    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        {
          title: strings('deposit.bank_details.navbar_title', {
            paymentMethod: paymentMethodName,
          }),
        },
        theme,
      ),
    );

    endTrace({
      name: TraceName.LoadDepositExperience,
      data: {
        destination: Routes.DEPOSIT.BANK_DETAILS,
      },
    });

    endTrace({
      name: TraceName.DepositContinueFlow,
      data: {
        destination: Routes.DEPOSIT.BANK_DETAILS,
      },
    });

    endTrace({
      name: TraceName.DepositInputOtp,
      data: {
        destination: Routes.DEPOSIT.BANK_DETAILS,
      },
    });
  }, [navigation, theme, order]);

  const handleBankTransferSent = useCallback(async () => {
    setCancelOrderError(null);
    if (isLoadingConfirmPayment || !order) return;
    try {
      setIsLoadingConfirmPayment(true);
      if (!hasDepositOrderField(order?.data, 'paymentOptions')) {
        console.error('Order or payment options not found');
        Logger.error(
          new Error('Order or payment options not found'),
          'BankDetails: handleBankTransferSent',
        );
        return;
      }

      const paymentOptionId = order.data.paymentOptions?.[0]?.id;
      if (!paymentOptionId) {
        console.error('Payment options not found or empty');
        Logger.error(
          new Error('Payment options not found or empty'),
          'BankDetails: handleBankTransferSent',
        );
        return;
      }

      const cryptoCurrency = getCryptoCurrencyFromTransakId(
        order.data.cryptoCurrency,
        order.data.network,
      );
      await confirmPayment(order.id, paymentOptionId);

      trackEvent('RAMPS_TRANSACTION_CONFIRMED', {
        ramp_type: 'DEPOSIT',
        amount_source: Number(order.data.fiatAmount),
        amount_destination: Number(order.cryptoAmount),
        exchange_rate: Number(order.data.exchangeRate),
        gas_fee: 0, //Number(order.data.gasFee),
        processing_fee: 0, //Number(order.data.processingFee),
        total_fee: Number(order.data.totalFeesFiat),
        payment_method_id: order.data.paymentMethod,
        country: selectedRegion?.isoCode || '',
        chain_id: cryptoCurrency?.chainId || '',
        currency_destination: cryptoCurrency?.assetId || '',
        currency_source: order.data.fiatCurrency,
      });

      await handleOnRefresh();
    } catch (fetchError) {
      Logger.error(fetchError as Error, 'BankDetails: handleBankTransferSent');
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
    selectedRegion?.isoCode,
    confirmPayment,
    handleOnRefresh,
  ]);

  const handleCancelOrder = useCallback(async () => {
    setConfirmPaymentError(null);
    if (isLoadingCancelOrder) return;
    try {
      setIsLoadingCancelOrder(true);
      await cancelOrder();
      await handleOnRefresh();
    } catch (fetchError) {
      Logger.error(fetchError as Error, 'BankDetails: handleCancelOrder');
      setCancelOrderError(fetchError as Error);
    } finally {
      setIsLoadingCancelOrder(false);
    }
  }, [cancelOrder, handleOnRefresh, isLoadingCancelOrder]);

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

export default BankDetails;
