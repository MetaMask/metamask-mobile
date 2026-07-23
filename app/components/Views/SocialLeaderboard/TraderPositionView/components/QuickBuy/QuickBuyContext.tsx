import React, { createContext, useCallback } from 'react';
import {
  useQuickBuyController,
  type UseQuickBuyControllerResult,
} from './hooks/useQuickBuyController';
import { useQuickBuyQuickAmountPreferences } from './hooks/useQuickBuyQuickAmountPreferences';
import type {
  QuickBuyAmountTuple,
  QuickBuySellPercentTuple,
} from './utils/quickBuyQuickAmounts';
import type {
  QuickBuyAnalyticsContext,
  QuickBuyFeatures,
  QuickBuyScreen,
  QuickBuyTarget,
} from './types';

export interface QuickBuyContextValue extends UseQuickBuyControllerResult {
  target: QuickBuyTarget;
  features: QuickBuyFeatures;
  analyticsContext?: QuickBuyAnalyticsContext;
  onClose: () => void;
  activeScreen: QuickBuyScreen;
  setActiveScreen: (screen: QuickBuyScreen) => void;
  buyQuickAmounts: QuickBuyAmountTuple;
  sellQuickPercentages: QuickBuySellPercentTuple;
  isQuickAmountPreferencesLoaded: boolean;
  saveQuickAmountPreferences: (next: {
    buyAmounts: QuickBuyAmountTuple;
    sellPercentages: QuickBuySellPercentTuple;
  }) => Promise<void>;
  /**
   * Called by the Buy button. When the high-price-impact modal feature is
   * enabled and the active quote exceeds the error threshold, this navigates
   * to the `priceImpactConfirm` screen instead of submitting immediately.
   * Otherwise it delegates directly to `handleConfirm`.
   */
  handleBuy: () => Promise<void>;
}

export const QuickBuyContext = createContext<QuickBuyContextValue | null>(null);

interface QuickBuyProviderProps {
  target: QuickBuyTarget;
  onClose: () => void;
  features: QuickBuyFeatures;
  analyticsContext?: QuickBuyAnalyticsContext;
  activeScreen: QuickBuyScreen;
  setActiveScreen: (screen: QuickBuyScreen) => void;
  children: React.ReactNode;
}

export const QuickBuyProvider: React.FC<QuickBuyProviderProps> = ({
  target,
  onClose,
  features,
  analyticsContext,
  activeScreen,
  setActiveScreen,
  children,
}) => {
  const controller = useQuickBuyController(target, onClose, analyticsContext);
  const {
    currentCurrency,
    usdToCurrentCurrencyRate,
    isPriceImpactError,
    isPresetAddFundsMode,
    handleConfirm,
  } = controller;

  const {
    buyAmounts: buyQuickAmounts,
    sellPercentages: sellQuickPercentages,
    savePreferences: saveQuickAmountPreferences,
    isLoaded: isQuickAmountPreferencesLoaded,
  } = useQuickBuyQuickAmountPreferences({
    currentCurrency,
    usdToCurrentCurrencyRate,
  });

  const handleBuy = useCallback(async () => {
    if (!isPresetAddFundsMode && isPriceImpactError) {
      // We guard here to ensure no high-impact trade ever silently proceeds.
      if (features.highPriceImpactModal) {
        setActiveScreen('priceImpactConfirm');
      }
      return;
    }
    await handleConfirm();
  }, [
    features.highPriceImpactModal,
    isPresetAddFundsMode,
    isPriceImpactError,
    handleConfirm,
    setActiveScreen,
  ]);

  // When the modal feature is off the button must be disabled for any
  // high-impact quote, since there is no other safeguard in place.
  const isConfirmDisabled =
    controller.isConfirmDisabled ||
    (!isPresetAddFundsMode &&
      isPriceImpactError &&
      !features.highPriceImpactModal);

  const value: QuickBuyContextValue = {
    ...controller,
    isConfirmDisabled,
    target,
    features,
    analyticsContext,
    onClose,
    activeScreen,
    setActiveScreen,
    buyQuickAmounts,
    sellQuickPercentages,
    isQuickAmountPreferencesLoaded,
    saveQuickAmountPreferences,
    handleBuy,
  };

  return (
    <QuickBuyContext.Provider value={value}>
      {children}
    </QuickBuyContext.Provider>
  );
};
