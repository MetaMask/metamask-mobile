import React, { createContext, useCallback } from 'react';
import {
  useQuickBuyController,
  type UseQuickBuyControllerResult,
} from './hooks/useQuickBuyController';
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
  setActiveScreen: React.Dispatch<React.SetStateAction<QuickBuyScreen>>;
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
  setActiveScreen: React.Dispatch<React.SetStateAction<QuickBuyScreen>>;
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
  const { isPriceImpactError, handleConfirm } = controller;

  const handleBuy = useCallback(async () => {
    if (features.highPriceImpactModal && isPriceImpactError) {
      setActiveScreen('priceImpactConfirm');
      return;
    }
    await handleConfirm();
  }, [
    features.highPriceImpactModal,
    isPriceImpactError,
    handleConfirm,
    setActiveScreen,
  ]);

  const value: QuickBuyContextValue = {
    ...controller,
    target,
    features,
    analyticsContext,
    onClose,
    activeScreen,
    setActiveScreen,
    handleBuy,
  };

  return (
    <QuickBuyContext.Provider value={value}>
      {children}
    </QuickBuyContext.Provider>
  );
};
