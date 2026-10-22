import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  incrementBridgeBalanceRefreshKey,
  resetBridgeTokenInputs,
  selectDestToken,
  selectRecurringPriceRange,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { useAutoUpgradeEIP7702Account } from '../../hooks/useAutoUpgradeEIP7702Account';
import { useEIP7702UpgradeFee } from '../../hooks/useEIP7702UpgradeFee';
import { useFiatToUsdRate } from '../../hooks/useFiatToUsdRate';
import {
  convertPriceRangeToUsd,
  USD_PRICE_RANGE_CURRENCY,
} from '../../utils/priceRange';
import RecurringConfirmOrderSheet from './RecurringConfirmOrderSheet';
import {
  showRecurringAutoUpgradeError,
  showRecurringOrderCreatedToast,
  submitRecurringOrder,
} from './RecurringConfirmOrderSheet.utils';
import { FeatureId } from '@metamask/bridge-controller';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { getOrderTypeFromPriceRange } from '../../utils/recurringOrders';

export const RecurringConfirmOrderSheetScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const priceRange = useSelector(selectRecurringPriceRange);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const sourceWalletAddress = useSelector(selectSourceWalletAddress);
  const fiatToUsdRate = useFiatToUsdRate(sourceToken?.chainId);
  const { autoUpgradeEIP7702Account } = useAutoUpgradeEIP7702Account({
    address: sourceWalletAddress,
    chainId: sourceToken?.chainId,
  });
  const delegationFee = useEIP7702UpgradeFee();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
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

  const sharedAdvancedOrderProperties = useMemo(
    () => ({
      feature_id: FeatureId.RECURRING_ORDER,
      // TODO use location from navigation context
      location: 'Main View',
    }),
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (isSubmittingRef.current || !isPriceRangeConversionReady) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    let isAccountUpgraded = false;

    try {
      await autoUpgradeEIP7702Account();
      isAccountUpgraded = true;
      await submitRecurringOrder();
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ADVANCED_ORDER_COMPLETED)
          .addProperties({
            ...sharedAdvancedOrderProperties,
            order_type: getOrderTypeFromPriceRange(priceRange),
          })
          .build(),
      );
      showRecurringOrderCreatedToast();
      dispatch(resetBridgeTokenInputs());
      Engine.context.BridgeController?.resetState?.();
      dispatch(incrementBridgeBalanceRefreshKey());
      navigation.goBack();
    } catch (error) {
      showRecurringAutoUpgradeError(error);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ADVANCED_ORDER_FAILED)
          .addProperties({
            ...sharedAdvancedOrderProperties,
            order_type: getOrderTypeFromPriceRange(priceRange),
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
    createEventBuilder,
    priceRange,
    trackEvent,
    dispatch,
    isPriceRangeConversionReady,
    navigation,
    sharedAdvancedOrderProperties,
  ]);

  const handleEditSlippagePress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: sourceToken?.chainId,
        destChainId: destToken?.chainId,
      },
    });
  }, [destToken?.chainId, navigation, sourceToken?.chainId]);

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
      onEditSlippagePress={handleEditSlippagePress}
      onDelegationFeeInfoPress={handleDelegationFeeInfoPress}
      goBack={navigation.goBack}
    />
  );
};
