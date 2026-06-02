import React, { createContext } from 'react';
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

  const value: QuickBuyContextValue = {
    ...controller,
    target,
    features,
    analyticsContext,
    onClose,
    activeScreen,
    setActiveScreen,
  };

  return (
    <QuickBuyContext.Provider value={value}>
      {children}
    </QuickBuyContext.Provider>
  );
};
