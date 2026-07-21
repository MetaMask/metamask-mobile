import React, { createContext, useCallback, useState } from 'react';
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
  setActiveScreen: (screen: QuickBuyScreen) => void;
  /**
   * Called by the Buy button. When the high-price-impact modal feature is
   * enabled and the active quote exceeds the error threshold, this navigates
   * to the `priceImpactConfirm` screen instead of submitting immediately.
   * Otherwise it delegates directly to `handleConfirm`.
   */
  handleBuy: () => Promise<void>;
  /**
   * Keyboard vs slider A/B assignment (`socialAiTSA905AbtestQuickBuyKeyboard`).
   * When true (treatment), the numeric keypad replaces the percentage slider.
   */
  useKeyboard: boolean;
  /** Whether the numeric keypad is currently shown (treatment only). */
  isKeypadOpen: boolean;
  setIsKeypadOpen: (open: boolean) => void;
}

export const QuickBuyContext = createContext<QuickBuyContextValue | null>(null);

interface QuickBuyProviderProps {
  target: QuickBuyTarget;
  onClose: () => void;
  features: QuickBuyFeatures;
  analyticsContext?: QuickBuyAnalyticsContext;
  activeScreen: QuickBuyScreen;
  setActiveScreen: (screen: QuickBuyScreen) => void;
  /** A/B assignment: true renders the keypad, false keeps the slider. */
  useKeyboard?: boolean;
  children: React.ReactNode;
}

export const QuickBuyProvider: React.FC<QuickBuyProviderProps> = ({
  target,
  onClose,
  features,
  analyticsContext,
  activeScreen,
  setActiveScreen,
  useKeyboard = false,
  children,
}) => {
  const controller = useQuickBuyController(
    target,
    onClose,
    analyticsContext,
    useKeyboard,
  );
  // Keypad starts open on the treatment so the user can type immediately.
  const [isKeypadOpen, setIsKeypadOpen] = useState(useKeyboard);
  const { isPriceImpactError, isPresetAddFundsMode, handleConfirm } =
    controller;

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
    handleBuy,
    useKeyboard,
    isKeypadOpen,
    setIsKeypadOpen,
  };

  return (
    <QuickBuyContext.Provider value={value}>
      {children}
    </QuickBuyContext.Provider>
  );
};
