import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, ImageSourcePropType, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { SellOrder } from '@consensys/on-ramp-sdk/dist/API';
import {
  TransactionParams,
  WalletDevice,
} from '@metamask/transaction-controller';
import { toHex } from '@metamask/controller-utils';
import { CaipAssetType, isCaipChainId, toCaipChainId } from '@metamask/utils';
import { NetworkConfiguration } from '@metamask/network-controller';

import Row from '../../components/Row';
import ScreenLayout from '../../components/ScreenLayout';
import PaymentMethodIcon from '../../components/PaymentMethodIcon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import RemoteImage from '../../../../../Base/RemoteImage';

import styleSheet from './SendTransaction.styles';
import imageIcons from 'images/image-icons';

import { RootState } from '../../../../../../reducers';
import {
  getOrderById,
  getProviderName,
  setFiatSellTxHash,
} from '../../../../../../reducers/fiatOrders';
import { useParams } from '../../../../../../util/navigation/navUtils';
import {
  bigIntToHex,
  fromTokenMinimalUnitString,
  toTokenMinimalUnit,
} from '../../../../../../util/number/bigint';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { addTransaction } from '../../../../../../util/transaction-controller';

import { NATIVE_ADDRESS } from '../../../../../../constants/on-ramp';
import { safeToChecksumAddress } from '../../../../../../util/address';
import { generateTransferData } from '../../../../../../util/transactions';
import useAnalytics from '../../../hooks/useAnalytics';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../../selectors/networkController';
import { getMemoizedInternalAccountByAddress } from '../../../../../../selectors/accountsController';
import { sendMultichainTransactionForReview } from '../../../../../Views/confirmations/utils/multichain-snaps';
import {
  SnapAmountValidationResult,
  validateTronTransferAmount,
} from '../../../../../../core/Multichain/tron';

import { RAMPS_SEND } from '../../constants';

interface SendTransactionParams {
  orderId?: string;
}

// A missing result means the Snap threw or returned nothing. We fail closed
// with a retryable message instead of opening the Snap confirmation.
function getTronValidationErrorMessage(
  result: SnapAmountValidationResult | undefined,
): string {
  if (!result) {
    return strings(
      'fiat_on_ramp_aggregator.send_transaction.tron_validation_failed',
    );
  }
  const errorCode = result.errors?.[0]?.code;
  if (errorCode === 'InsufficientBalance') {
    return strings('send.insufficient_funds');
  }
  if (errorCode === 'InsufficientBalanceToCoverFee') {
    return strings(
      'fiat_on_ramp_aggregator.send_transaction.insufficient_tron_resources',
    );
  }
  return strings('send.invalid_value');
}

function SendTransaction() {
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<SendTransactionParams>();
  const dispatch = useDispatch();
  const order = useSelector((state: RootState) =>
    getOrderById(state, params.orderId),
  );
  const trackEvent = useAnalytics();
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const [isConfirming, setIsConfirming] = useState(false);
  const [validationError, setValidationError] = useState<string>();
  const [isValidating, setIsValidating] = useState(false);

  const { styles, theme } = useStyles(styleSheet, {});
  const { colors, themeAppearance } = theme;

  const orderData = order?.data as SellOrder;

  // Non-EVM (e.g. Solana) assets carry a CAIP-2 chain id (e.g. "solana:...").
  // Legacy EVM orders use a numeric chain id ("1"), so isCaipChainId is false.
  const assetChainId = orderData?.cryptoCurrency?.network?.chainId;
  const isNonEvm = useMemo(
    () =>
      Boolean(assetChainId) &&
      isCaipChainId(assetChainId) &&
      !assetChainId.startsWith('eip155:'),
    [assetChainId],
  );
  const isStellar = assetChainId?.startsWith('stellar:') ?? false;
  const isTron = assetChainId?.startsWith('tron:') ?? false;

  const fromAccount = useSelector((state: RootState) =>
    orderData?.walletAddress
      ? getMemoizedInternalAccountByAddress(state, orderData.walletAddress)
      : undefined,
  );

  const networkClientId = useMemo(() => {
    const chainId = orderData?.cryptoCurrency?.network?.chainId;
    if (!chainId) return null;
    const caipChainId = isCaipChainId(chainId)
      ? chainId
      : toCaipChainId('eip155', chainId);
    const networkConfig = networkConfigurations?.[
      caipChainId
    ] as NetworkConfiguration;
    if (!networkConfig) return null;

    const { rpcEndpoints, defaultRpcEndpointIndex } = networkConfig;
    return rpcEndpoints?.[defaultRpcEndpointIndex]?.networkClientId;
  }, [networkConfigurations, orderData]);

  const headerTitle = strings(
    'fiat_on_ramp_aggregator.send_transaction.sell_crypto',
  );

  const handleHeaderBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const transactionAnalyticsPayload = useMemo(
    () => ({
      crypto_amount: orderData?.cryptoAmount as string,
      chain_id_source: orderData?.cryptoCurrency?.network?.chainId,
      fiat_out: orderData?.fiatAmount,
      payment_method_id: orderData?.paymentMethod?.id,
      currency_source: orderData?.cryptoCurrency?.symbol,
      currency_destination: orderData?.fiatCurrency?.symbol,
      order_id: order?.id,
      provider_offramp: orderData?.provider?.name,
    }),
    [order?.id, orderData],
  );

  useEffect(() => {
    trackEvent(
      'OFFRAMP_SEND_CRYPTO_PROMPT_VIEWED',
      //@ts-expect-error - TODO: Ramps team needs to resolve discrepancy between
      // transactionAnalyticsPayload expecting chain_id_source to be a string
      // but RampTransaction type / interface expecting it to be a number
      transactionAnalyticsPayload,
    );
  }, [trackEvent, transactionAnalyticsPayload]);

  // Tron resource and fee requirements depend on the destination and the
  // transaction being built, so validate against the provider deposit address.
  // Returns true only when the Snap explicitly reports the transfer as valid.
  const validateTronTransfer = useCallback(async (): Promise<boolean> => {
    const chainId = orderData?.cryptoCurrency?.network?.chainId;
    const assetReference = orderData?.cryptoCurrency?.assetId;
    if (!orderData || !fromAccount || !chainId || !assetReference) {
      return false;
    }

    let result: SnapAmountValidationResult | undefined;
    try {
      result = await validateTronTransferAmount(fromAccount, {
        accountId: fromAccount.id,
        assetId: `${chainId}/${assetReference}` as CaipAssetType,
        value: String(orderData.cryptoAmount ?? '0'),
        toAddress: orderData.depositWallet,
      });
    } catch {
      result = undefined;
    }

    if (result?.valid === true) {
      setValidationError(undefined);
      return true;
    }
    const errorMessage = getTronValidationErrorMessage(result);
    setValidationError(errorMessage);
    // Announce on every failed attempt, including a retry that returns the
    // same message, so screen reader users know the check ran again.
    AccessibilityInfo.announceForAccessibility(errorMessage);
    return false;
  }, [orderData, fromAccount]);

  // Next stays disabled while a validation error is shown (ticket criterion).
  // The user re-checks explicitly, e.g. after adding TRX or staking for energy.
  const handleRetryValidation = useCallback(async () => {
    setIsValidating(true);
    try {
      await validateTronTransfer();
    } finally {
      setIsValidating(false);
    }
  }, [validateTronTransfer]);

  const handleSend = useCallback(async () => {
    const chainId = orderData?.cryptoCurrency?.network?.chainId;
    if (!chainId) return;

    // Non-EVM: delegate the transfer to the account's Snap via `confirmSend`.
    // The Snap builds the transaction, shows its own confirmation, signs, and
    // broadcasts, returning the transaction id we store as the sell tx hash.
    if (isNonEvm) {
      const assetReference = orderData?.cryptoCurrency?.assetId;
      if (!fromAccount?.metadata?.snap?.id || !assetReference) {
        trackEvent(
          'OFFRAMP_SEND_TRANSACTION_REJECTED',
          //@ts-expect-error - TODO: Ramps team needs to resolve discrepancy between
          // transactionAnalyticsPayload expecting chain_id_source to be a string
          // but RampTransaction type / interface expecting it to be a number
          transactionAnalyticsPayload,
        );
        return;
      }

      try {
        setIsConfirming(true);
        setValidationError(undefined);

        // The Ramps API splits the CAIP-19 asset id into network.chainId (CAIP-2)
        // and assetId (the asset reference); recombine them with a slash.
        const assetId = `${chainId}/${assetReference}` as CaipAssetType;
        const amount = String(orderData.cryptoAmount ?? '0');

        if (isTron && !(await validateTronTransfer())) {
          trackEvent(
            'OFFRAMP_SEND_TRANSACTION_REJECTED',
            //@ts-expect-error - TODO: Ramps team needs to resolve discrepancy between
            // transactionAnalyticsPayload expecting chain_id_source to be a string
            // but RampTransaction type / interface expecting it to be a number
            transactionAnalyticsPayload,
          );
          return;
        }

        trackEvent(
          'OFFRAMP_SEND_TRANSACTION_INVOKED',
          //@ts-expect-error - TODO: Ramps team needs to resolve discrepancy between
          // transactionAnalyticsPayload expecting chain_id_source to be a string
          // but RampTransaction type / interface expecting it to be a number
          transactionAnalyticsPayload,
        );

        const result = (await sendMultichainTransactionForReview(fromAccount, {
          fromAccountId: fromAccount.id,
          toAddress: orderData.depositWallet,
          assetId,
          // `confirmSend` expects a human-readable decimal amount (the Snap
          // applies decimals), unlike the EVM path which uses minimal units.
          amount,
        })) as { transactionId?: string; valid?: boolean } | undefined;

        // Match the existing non-EVM send: only `valid === false` is a
        // rejection. A completed transfer can omit transactionId, and staying
        // on this screen would let Next broadcast it again.
        if (result?.valid === false) {
          trackEvent(
            'OFFRAMP_SEND_TRANSACTION_REJECTED',
            //@ts-expect-error - TODO: Ramps team needs to resolve discrepancy between
            // transactionAnalyticsPayload expecting chain_id_source to be a string
            // but RampTransaction type / interface expecting it to be a number
            transactionAnalyticsPayload,
          );
          return;
        }

        if (result?.transactionId && order?.id) {
          dispatch(setFiatSellTxHash(order.id, result.transactionId));
        }
        navigation.goBack();
        trackEvent(
          'OFFRAMP_SEND_TRANSACTION_CONFIRMED',
          //@ts-expect-error - TODO: Ramps team needs to resolve discrepancy between
          // transactionAnalyticsPayload expecting chain_id_source to be a string
          // but RampTransaction type / interface expecting it to be a number
          transactionAnalyticsPayload,
        );
      } catch {
        trackEvent(
          'OFFRAMP_SEND_TRANSACTION_REJECTED',
          //@ts-expect-error - TODO: Ramps team needs to resolve discrepancy between
          // transactionAnalyticsPayload expecting chain_id_source to be a string
          // but RampTransaction type / interface expecting it to be a number
          transactionAnalyticsPayload,
        );
      } finally {
        setIsConfirming(false);
      }
      return;
    }

    // Sell orders may carry a CAIP-2 EVM id (`eip155:1`) as well as the legacy
    // numeric id (`1`). toHex only accepts the reference.
    const evmChainReference = chainId.startsWith('eip155:')
      ? chainId.slice('eip155:'.length)
      : chainId;
    let chainIdAsHex: `0x${string}`;
    try {
      chainIdAsHex = toHex(evmChainReference);
    } catch {
      return;
    }

    if (!networkClientId) {
      return;
    }

    try {
      setIsConfirming(true);
      let transactionParams: TransactionParams;
      const amount = bigIntToHex(
        toTokenMinimalUnit(
          orderData.cryptoAmount || '0',
          orderData.cryptoCurrency.decimals,
        ),
      );
      if (orderData.cryptoCurrency.address === NATIVE_ADDRESS) {
        transactionParams = {
          from: safeToChecksumAddress(orderData.walletAddress) as string,
          to: safeToChecksumAddress(orderData.depositWallet),
          value: amount,
          chainId: chainIdAsHex,
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

      trackEvent(
        'OFFRAMP_SEND_TRANSACTION_INVOKED',
        //@ts-expect-error - TODO: Ramps team needs to resolve discrepancy between
        // transactionAnalyticsPayload expecting chain_id_source to be a string
        // but RampTransaction type / interface expecting it to be a number
        transactionAnalyticsPayload,
      );

      const response = await addTransaction(transactionParams, {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId,
        origin: RAMPS_SEND,
        isInternal: true,
      });

      const hash = await response.result;

      if (order?.id) {
        dispatch(setFiatSellTxHash(order.id, hash));
        navigation.goBack();
        trackEvent(
          'OFFRAMP_SEND_TRANSACTION_CONFIRMED',
          //@ts-expect-error - TODO: Ramps team needs to resolve discrepancy between
          // transactionAnalyticsPayload expecting chain_id_source to be a string
          // but RampTransaction type / interface expecting it to be a number
          transactionAnalyticsPayload,
        );
      }
    } catch (error) {
      trackEvent(
        'OFFRAMP_SEND_TRANSACTION_REJECTED',
        //@ts-expect-error - TODO: Ramps team needs to resolve discrepancy between
        // transactionAnalyticsPayload expecting chain_id_source to be a string
        // but RampTransaction type / interface expecting it to be a number
        transactionAnalyticsPayload,
      );
    } finally {
      setIsConfirming(false);
    }
  }, [
    navigation,
    dispatch,
    order?.id,
    orderData,
    trackEvent,
    transactionAnalyticsPayload,
    networkClientId,
    isNonEvm,
    isTron,
    fromAccount,
    validateTronTransfer,
  ]);

  if (!order || !orderData?.cryptoCurrency) {
    return (
      <ScreenLayout>
        <HeaderStandard
          title={headerTitle}
          onBack={handleHeaderBack}
          backButtonProps={{ testID: 'send-transaction-back-button' }}
          includesTopInset
        />
      </ScreenLayout>
    );
  }

  let tokenIcon: ImageSourcePropType;
  const symbol = orderData.cryptoCurrency.symbol;
  if (symbol === 'ETH') {
    tokenIcon = imageIcons.ETHEREUM as ImageSourcePropType;
  } else if (Object.keys(imageIcons).includes(symbol)) {
    tokenIcon = imageIcons[
      symbol as keyof typeof imageIcons
    ] as ImageSourcePropType;
  } else {
    tokenIcon = { uri: orderData.cryptoCurrency.logo };
  }

  return (
    <ScreenLayout>
      <HeaderStandard
        title={headerTitle}
        onBack={handleHeaderBack}
        backButtonProps={{ testID: 'send-transaction-back-button' }}
        includesTopInset
      />
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <View style={styles.content}>
            <Row>
              <View style={styles.textRow}>
                <Text variant={TextVariant.HeadingMD} style={styles.normal}>
                  {strings('fiat_on_ramp_aggregator.send_transaction.send')}
                </Text>
                <Text variant={TextVariant.HeadingMD}>
                  {fromTokenMinimalUnitString(
                    toTokenMinimalUnit(
                      order.cryptoAmount || '0',
                      orderData.cryptoCurrency.decimals,
                    ).toString(),
                    orderData.cryptoCurrency.decimals,
                  )}
                </Text>
                <Avatar
                  size={AvatarSize.Sm}
                  variant={AvatarVariant.Token}
                  name={order.cryptocurrency}
                  imageSource={tokenIcon}
                />
                <Text variant={TextVariant.HeadingMD}>
                  {order.cryptocurrency}
                </Text>
              </View>
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
              isDisabled={
                isConfirming ||
                isValidating ||
                isStellar ||
                Boolean(validationError) ||
                (!isNonEvm && !networkClientId)
              }
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
          {validationError ? (
            <Row>
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Error}
                testID="send-transaction-validation-error"
                accessibilityRole="alert"
              >
                {validationError}
              </Text>
            </Row>
          ) : null}
          {validationError && isTron ? (
            <Row>
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                onPress={handleRetryValidation}
                isDisabled={isValidating}
                accessibilityState={{
                  busy: isValidating,
                  disabled: isValidating,
                }}
                label={strings(
                  'fiat_on_ramp_aggregator.send_transaction.retry_validation',
                )}
                testID="send-transaction-retry-validation"
              />
            </Row>
          ) : null}
          {/* <Row>
            <ButtonConfirm onLongPress={handleSend} disabled={isLoadingGas} />
          </Row> */}
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
}

export default SendTransaction;
