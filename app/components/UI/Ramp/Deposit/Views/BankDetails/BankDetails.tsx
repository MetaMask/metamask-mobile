import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, RefreshControl } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useDispatch, useSelector } from 'react-redux';
import styleSheet from './BankDetails.styles';
import { useNavigation } from '@react-navigation/native';
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
import {
  FiatOrder,
  getOrderById,
  updateFiatOrder,
} from '../../../../../../reducers/fiatOrders';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';
import { processFiatOrder } from '../../../index';
import { useTheme } from '../../../../../../util/theme';
import { RootState } from '../../../../../../reducers';
import { isDepositOrder } from '../../utils';
import { useDepositSDK } from '../../sdk';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';

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
  const { sdk } = useDepositSDK();

  const { orderId, shouldUpdate = true } = useParams<BankDetailsParams>();
  const order = useSelector((state: RootState) => getOrderById(state, orderId));

  const [showBankInfo, setShowBankInfo] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [{ error: confirmPaymentError }, confirmPayment] = useDepositSdkMethod({
    method: 'confirmPayment',
    onMount: false,
  });

  const [{ error: cancelOrderError }, cancelOrder] = useDepositSdkMethod(
    {
      method: 'cancelOrder',
      onMount: false,
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
      console.error(error);
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
    if (order?.state === FIAT_ORDER_STATES.CANCELLED) {
      navigation.navigate(Routes.WALLET.HOME);
    } else if (
      order?.state === FIAT_ORDER_STATES.PENDING ||
      order?.state === FIAT_ORDER_STATES.COMPLETED ||
      order?.state === FIAT_ORDER_STATES.FAILED
    ) {
      navigation.navigate(
        ...createOrderProcessingNavDetails({
          orderId,
        }),
      );
    }
  }, [order?.state, navigation, orderId]);

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
      if (!isDepositOrder(order?.data) || !order?.data?.paymentOptions)
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
  const accountName = firstName && lastName ? `${firstName} ${lastName}` : null;
  const accountType = getFieldValue('Account Type');
  const bankName = getFieldValue('Bank Name');
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
          title: strings('deposit.bank_details.title', {
            paymentMethod: 'SEPA',
          }),
        },
        theme,
      ),
    );
  }, [navigation, theme]);

  const handleBankTransferSent = useCallback(async () => {
    try {
      if (!isDepositOrder(order?.data)) {
        console.error('Order or payment options not found');
        return;
      }

      await confirmPayment(order.id, order.data.paymentOptions[0].id);

      if (confirmPaymentError) {
        console.error(confirmPaymentError);
        return;
      }

      await handleOnRefresh();

      navigation.navigate(
        ...createOrderProcessingNavDetails({
          orderId: order.id,
        }),
      );
    } catch (fetchError) {
      console.error(fetchError);
    }
  }, [navigation, confirmPayment, confirmPaymentError, handleOnRefresh, order]);

  const handleCancelOrder = useCallback(async () => {
    try {
      await cancelOrder();

      if (cancelOrderError) {
        console.error(cancelOrderError);
        return;
      }

      await handleOnRefresh();
    } catch (fetchError) {
      console.error(fetchError);
    }
  }, [cancelOrder, cancelOrderError, handleOnRefresh]);

  const toggleBankInfo = useCallback(() => {
    setShowBankInfo(!showBankInfo);
  }, [showBankInfo]);

  return (
    <ScreenLayout>
      <ScrollView
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
                {amount && (
                  <BankDetailRow
                    label={strings('deposit.bank_details.transfer_amount')}
                    value={amount}
                  />
                )}

                {accountName && (
                  <BankDetailRow
                    label={strings('deposit.bank_details.account_holder_name')}
                    value={accountName}
                  />
                )}

                {routingNumber && (
                  <BankDetailRow
                    label={strings('deposit.bank_details.routing_number')}
                    value={routingNumber}
                  />
                )}

                {accountNumber && (
                  <BankDetailRow
                    label={strings('deposit.bank_details.account_number')}
                    value={accountNumber}
                  />
                )}

                {iban && (
                  <BankDetailRow
                    label={strings('deposit.bank_details.iban')}
                    value={iban}
                  />
                )}

                {bic && (
                  <BankDetailRow
                    label={strings('deposit.bank_details.bic')}
                    value={bic}
                  />
                )}

                {accountType && (
                  <BankDetailRow
                    label={strings('deposit.bank_details.account_type')}
                    value={accountType}
                  />
                )}

                {showBankInfo && (
                  <>
                    {bankName && (
                      <BankDetailRow
                        label={strings('deposit.bank_details.bank_name')}
                        value={bankName}
                      />
                    )}

                    {bankAddress && (
                      <BankDetailRow
                        label={strings('deposit.bank_details.bank_address')}
                        value={bankAddress}
                      />
                    )}
                  </>
                )}

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
            {confirmPaymentError && (
              <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                {strings('deposit.bank_details.error_message')}
              </Text>
            )}
            <View style={styles.infoBanner}>
              <Icon
                name={IconName.SecurityKey}
                size={IconSize.Lg}
                color={theme.colors.icon.alternative}
              />
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Alternative}
                style={styles.infoBannerText}
              >
                {strings('deposit.bank_details.info_banner_text', {
                  accountHolderName: accountName,
                })}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                style={styles.button}
                variant={ButtonVariants.Secondary}
                onPress={handleCancelOrder}
                label={strings('deposit.order_processing.cancel_order_button')}
                size={ButtonSize.Lg}
              />

              <Button
                style={styles.button}
                variant={ButtonVariants.Primary}
                onPress={handleBankTransferSent}
                testID="main-action-button"
                label={strings('deposit.bank_details.button')}
                size={ButtonSize.Lg}
              />
            </View>
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default BankDetails;
