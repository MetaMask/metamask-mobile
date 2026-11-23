import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  incrementBridgeBalanceRefreshKey,
  resetBridgeTokenInputs,
  selectRecurring,
  selectDestToken,
  selectRecurringPriceRange,
  selectRecurringPriceTolerance,
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { useAutoUpgradeEIP7702Account } from '../../hooks/useAutoUpgradeEIP7702Account';
import { useEIP7702UpgradeFee } from '../../hooks/useEIP7702UpgradeFee';
import { useFiatToUsdRate } from '../../hooks/useFiatToUsdRate';
import { recurringOrdersApiClient } from '../../api/recurringOrders.client';
import {
  convertPriceRangeToUsd,
  USD_PRICE_RANGE_CURRENCY,
} from '../../utils/priceRange';
import { getRecurringOrderDelegationParams } from '../../utils/recurringOrders/getRecurringOrderDelegationParams';
import { signLimitOrderDelegations } from '../../utils/limitOrders/signLimitOrderDelegations';
import { useCreateRecurringOrder } from '../../hooks/useCreateRecurringOrder';
import { useParams } from '../../../../../util/navigation/navUtils';
import RecurringConfirmOrderSheet from './RecurringConfirmOrderSheet';
import type { RecurringConfirmOrderModalParams } from './RecurringConfirmOrderSheet.types';
import { showRecurringOrderCreatedToast } from './RecurringConfirmOrderSheet.utils';
import { FeatureId } from '@metamask/bridge-controller';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { getOrderTypeFromDraftPriceRange } from '../../utils/recurringOrders';
import {
  getAdvancedOrderTokenProperties,
  getAdvancedOrderTradeProperties,
} from '../../utils/advancedOrders';
import { showGenericErrorToast } from '../../utils/showGenericErrorToast';
import { useBridgeQuoteDataContext } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import {
  finishRecurringOrderTrace,
  type RecurringOrderCreateFailurePhase,
  startRecurringOrderCreateTrace,
} from '../../utils/recurringOrderTrace';
import { selectBridgeRecurringBuyDefaultPriceTolerance } from '../../../../../selectors/bridge/featureFlags';

export const RecurringConfirmOrderSheetScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const { location } = useParams<RecurringConfirmOrderModalParams>();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const sourceAmount = useSelector(selectSourceAmount);
  const recurring = useSelector(selectRecurring);
  const priceRange = useSelector(selectRecurringPriceRange);
  const recurringPriceTolerance = useSelector(selectRecurringPriceTolerance);
  const defaultPriceTolerance = useSelector(
    selectBridgeRecurringBuyDefaultPriceTolerance,
  );
  const priceTolerance = recurringPriceTolerance ?? defaultPriceTolerance;
  const getSelectedAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const sourceWalletAddress = useSelector(selectSourceWalletAddress);
  const fiatToUsdRate = useFiatToUsdRate(sourceToken?.chainId);
  const { autoUpgradeEIP7702Account } = useAutoUpgradeEIP7702Account({
    address: sourceWalletAddress,
    chainId: sourceToken?.chainId,
  });
  const delegationFee = useEIP7702UpgradeFee();
  const { createRecurringOrder } = useCreateRecurringOrder();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const clientOrderId = useMemo(
    () => uuidv4(),
    // Keep the id stable across retries, but replace it when the draft changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      sourceToken?.address,
      sourceToken?.chainId,
      sourceToken?.decimals,
      destToken?.address,
      destToken?.chainId,
      sourceAmount,
      recurring.everyValue,
      recurring.everyUnit,
      recurring.repeatCount,
      priceRange,
      priceTolerance,
    ],
  );
  const canConvertStoredCurrency =
    !priceRange ||
    priceRange.currency.toUpperCase() === USD_PRICE_RANGE_CURRENCY ||
    priceRange.currency.toUpperCase() === currentCurrency?.toUpperCase();
  const usdPriceRange = useMemo(
    () =>
      canConvertStoredCurrency
        ? convertPriceRangeToUsd(priceRange, fiatToUsdRate)
        : undefined,
    [canConvertStoredCurrency, fiatToUsdRate, priceRange],
  );
  const isPriceRangeConversionReady =
    !priceRange || usdPriceRange !== undefined;

  const { trackEvent, createEventBuilder } = useAnalytics();

  const { activeQuote } = useBridgeQuoteDataContext();

  const sharedAdvancedOrderProperties = useMemo(
    () => ({
      ...getAdvancedOrderTokenProperties({ sourceToken, destToken }),
      ...getAdvancedOrderTradeProperties(activeQuote),
      feature_id: FeatureId.RECURRING_ORDER,
      location,
    }),
    [sourceToken, destToken, activeQuote, location],
  );

  const handleConfirm = useCallback(async () => {
    if (isSubmittingRef.current || !isPriceRangeConversionReady) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    let isAccountUpgraded = false;
    let failurePhase: RecurringOrderCreateFailurePhase = 'account_upgrade';
    const traceHandle = startRecurringOrderCreateTrace();

    try {
      await autoUpgradeEIP7702Account();
      isAccountUpgraded = true;
      failurePhase = 'delegation_prepare';
      const delegationParams = getRecurringOrderDelegationParams({
        clientOrderId,
        sourceToken,
        destToken,
        sourceAmount,
        recurring,
        getSelectedAccountByScope,
      });
      const preparedDelegations =
        await recurringOrdersApiClient.prepareRecurringDelegation(
          delegationParams,
        );
      // The backend currently returns only the delegations needed to execute.
      // Recurring and limit orders use the same delegation shape, so sign every
      // delegation returned while the complete recurring set is finalized.
      failurePhase = 'signing';
      const signedDelegations = await signLimitOrderDelegations(
        preparedDelegations.delegations,
      );
      failurePhase = 'create';
      await createRecurringOrder({
        accountAddress: delegationParams.accountAddress,
        clientOrderId: preparedDelegations.order.clientOrderId,
        src: {
          assetId: delegationParams.srcAssetId,
          amount: delegationParams.srcAmount,
        },
        dest: {
          assetId: delegationParams.destAssetId,
        },
        priceTolerance: Number(priceTolerance),
        schedule: {
          every: delegationParams.every,
          unit: delegationParams.unit,
          repeatCount: delegationParams.repeatCount,
        },
        ...(usdPriceRange ? { priceRange: usdPriceRange } : {}),
        delegations: signedDelegations,
      });
      finishRecurringOrderTrace(traceHandle, { result: 'success' });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ADVANCED_ORDER_COMPLETED)
          .addProperties({
            ...sharedAdvancedOrderProperties,
            order_type: getOrderTypeFromDraftPriceRange(priceRange),
          })
          .build(),
      );
      showRecurringOrderCreatedToast();
      dispatch(resetBridgeTokenInputs());
      Engine.context.BridgeController?.resetState?.();
      dispatch(incrementBridgeBalanceRefreshKey());
      navigation.goBack();
    } catch (error) {
      finishRecurringOrderTrace(traceHandle, {
        result: 'error',
        failurePhase,
      });
      // Close bottom sheet so user can see the toast
      navigation.goBack();
      showGenericErrorToast();
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ADVANCED_ORDER_FAILED)
          .addProperties({
            ...sharedAdvancedOrderProperties,
            order_type: getOrderTypeFromDraftPriceRange(priceRange),
            error: isAccountUpgraded
              ? (error as Error).message
              : 'delegation_failed',
          })
          .build(),
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    autoUpgradeEIP7702Account,
    clientOrderId,
    createEventBuilder,
    createRecurringOrder,
    destToken,
    getSelectedAccountByScope,
    priceRange,
    priceTolerance,
    recurring,
    sourceAmount,
    sourceToken,
    trackEvent,
    dispatch,
    isPriceRangeConversionReady,
    navigation,
    sharedAdvancedOrderProperties,
    usdPriceRange,
  ]);

  const handleDelegationFeeInfoPress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_DELEGATION_FEE_INFO_MODAL,
    });
  }, [navigation]);

  return (
    <RecurringConfirmOrderSheet
      currentCurrency={currentCurrency ?? USD_PRICE_RANGE_CURRENCY}
      delegationFee={delegationFee}
      fiatToUsdRate={fiatToUsdRate}
      isPriceRangeConversionReady={isPriceRangeConversionReady}
      isSubmitting={isSubmitting}
      onConfirm={handleConfirm}
      onDelegationFeeInfoPress={handleDelegationFeeInfoPress}
      goBack={navigation.goBack}
    />
  );
};
