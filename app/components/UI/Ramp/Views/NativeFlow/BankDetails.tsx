import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, RefreshControl } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import styleSheet from '../../Deposit/Views/BankDetails/BankDetails.styles';
import { useNavigation } from '@react-navigation/native';
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
  normalizeProviderCode,
  RampsOrderStatus,
  type TransakDepositOrder,
} from '@metamask/ramps-controller';
import { useTheme } from '../../../../../util/theme';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import PrivacySection from '../../Deposit/components/PrivacySection';
import useAnalytics from '../../hooks/useAnalytics';

import Logger from '../../../../../util/Logger';
import { useTransakController } from '../../hooks/useTransakController';
import { useRampsUserRegion } from '../../hooks/useRampsUserRegion';
import { selectTokens } from '../../../../../selectors/rampsController';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import { useRampsOrders } from '../../hooks/useRampsOrders';
import { useSelector } from 'react-redux';
import { isHttpUnauthorized } from '../../utils/isHttpUnauthorized';

export interface BankDetailsParams {
  orderId: string;
  shouldUpdate?: boolean;
}

const TERMINAL_STATUSES = new Set([
  RampsOrderStatus.Completed,
  RampsOrderStatus.Failed,
  RampsOrderStatus.Cancelled,
]);

/**
 * V2 bank details screen. Reads order lifecycle from controller state
 * and fetches deposit-specific data (paymentDetails) from TransakService.
 */
const V2BankDetails = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = useTheme();
  const {
    logoutFromProvider,
    getOrder: getDepositOrder,
    confirmPayment,
    cancelOrder: transakCancelOrder,
  } = useTransakController();
  const { userRegion } = useRampsUserRegion();
  const tokensResource = useSelector(selectTokens);
  const selectedCryptoCurrency = tokensResource?.selected;
  const trackEvent = useAnalytics();
  const { getOrderById, refreshOrder } = useRampsOrders();

  const regionIsoCode = userRegion?.country?.isoCode || '';

  const { orderId, shouldUpdate = true } = useParams<BankDetailsParams>();
  const order = getOrderById(orderId);

  const [depositOrder, setDepositOrder] = useState<TransakDepositOrder | null>(
    null,
  );
  const [showBankInfo, setShowBankInfo] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [cancelOrderError, setCancelOrderError] = useState<Error | null>(null);
  const [isLoadingCancelOrder, setIsLoadingCancelOrder] = useState(false);

  const [confirmPaymentError, setConfirmPaymentError] = useState<string | null>(
    null,
  );
  const [isLoadingConfirmPayment, setIsLoadingConfirmPayment] = useState(false);

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

      const updatedDepositOrder = await getDepositOrder(
        order.providerOrderId,
        order.walletAddress,
      );
      if (updatedDepositOrder) {
        setDepositOrder(updatedDepositOrder);
      }

      const providerCode = normalizeProviderCode(order.provider?.id ?? '');
      await refreshOrder(
        providerCode,
        order.providerOrderId,
        order.walletAddress,
      );
    } catch (refreshError) {
      if (isHttpUnauthorized(refreshError)) {
        await handleLogoutError();
        return;
      }
      Logger.error(refreshError as Error, 'V2BankDetails: handleOnRefresh');
    } finally {
      setIsRefreshing(false);
    }
  }, [order, getDepositOrder, refreshOrder, handleLogoutError]);

  useEffect(() => {
    if (order?.status === RampsOrderStatus.Created && shouldUpdate) {
      handleOnRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!order?.status) return;
    if (
      TERMINAL_STATUSES.has(order.status) ||
      order.status === RampsOrderStatus.Pending
    ) {
      // @ts-expect-error navigation prop mismatch
      navigation.replace(Routes.RAMP.RAMPS_ORDER_DETAILS, {
        orderId: order.providerOrderId,
        showCloseButton: true,
      });
    }
  }, [order?.status, navigation, order?.providerOrderId]);

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
      const details = depositOrder?.paymentDetails ?? order?.paymentDetails;
      if (!details?.length) return null;

      const field = details[0].fields.find((f) => f.name === fieldName);
      if (!field?.value) return null;

      return capitalizeWords(field.value);
    },
    [depositOrder, order, capitalizeWords],
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

  const paymentMethodShortName =
    depositOrder?.paymentMethod?.shortName ??
    order?.paymentMethod?.shortName ??
    '';

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        {
          title: strings('deposit.bank_details.navbar_title', {
            paymentMethod: paymentMethodShortName,
          }),
        },
        theme,
      ),
    );
  }, [navigation, theme, paymentMethodShortName]);

  const handleBankTransferSent = useCallback(async () => {
    setCancelOrderError(null);
    if (isLoadingConfirmPayment || !order) return;
    try {
      setIsLoadingConfirmPayment(true);

      const paymentMethodId =
        depositOrder?.paymentMethod?.id ?? order.paymentMethod?.id;
      if (!paymentMethodId) {
        Logger.error(
          new Error('Payment method not found or empty'),
          'V2BankDetails: handleBankTransferSent',
        );
        return;
      }

      await confirmPayment(order.providerOrderId, paymentMethodId);

      trackEvent('RAMPS_TRANSACTION_CONFIRMED', {
        ramp_type: 'DEPOSIT',
        amount_source: Number(order.fiatAmount),
        amount_destination: Number(order.cryptoAmount),
        exchange_rate: Number(order.exchangeRate),
        gas_fee: 0,
        processing_fee: 0,
        total_fee: Number(order.totalFeesFiat),
        payment_method_id: paymentMethodId,
        country: regionIsoCode,
        chain_id: selectedCryptoCurrency?.chainId || '',
        currency_destination: selectedCryptoCurrency?.assetId || '',
        currency_source: order.fiatCurrency?.symbol || '',
      });

      await handleOnRefresh();
    } catch (fetchError) {
      if (isHttpUnauthorized(fetchError)) {
        await handleLogoutError();
        return;
      }
      Logger.error(
        fetchError as Error,
        'V2BankDetails: handleBankTransferSent',
      );
      setConfirmPaymentError(
        parseUserFacingError(
          fetchError,
          strings('deposit.bank_details.error_message'),
        ),
      );
    } finally {
      setIsLoadingConfirmPayment(false);
    }
  }, [
    isLoadingConfirmPayment,
    order,
    depositOrder,
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
      await transakCancelOrder(order.providerOrderId);
      await handleOnRefresh();
    } catch (fetchError) {
      if (isHttpUnauthorized(fetchError)) {
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

  const hasData = order && (depositOrder || order.paymentDetails?.length);

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

            {hasData ? (
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
                {confirmPaymentError}
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
                disabled={isLoadingConfirmPayment || isLoadingCancelOrder}
              />

              <Button
                style={styles.button}
                variant={ButtonVariants.Primary}
                onPress={handleBankTransferSent}
                testID="main-action-button"
                label={strings('deposit.bank_details.button')}
                size={ButtonSize.Lg}
                disabled={isLoadingCancelOrder || isLoadingConfirmPayment}
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
