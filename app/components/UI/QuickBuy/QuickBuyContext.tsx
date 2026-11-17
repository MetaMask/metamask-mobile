import React, {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { selectDestToken } from '../../../core/redux/slices/bridge';
import { isNegativeSecurityType } from '../Bridge/utils/tokenSecurityUtils';
import { TokenWarningModalMode } from '../Bridge/components/TokenWarningModal/constants';
import { getQuickBuyEntryPoint } from './utils/getQuickBuyEntryPoint';
import {
  useQuickBuyController,
  type UseQuickBuyControllerResult,
} from './hooks/useQuickBuyController';
import {
  getDefaultSellQuickPercentages,
  type QuickBuySellPercentTuple,
} from './utils/quickBuyQuickAmounts';
import type {
  QuickBuyAnalyticsContext,
  QuickBuyFeatures,
  QuickBuyScreen,
  QuickBuyTarget,
  QuickBuyTradeMode,
} from './types';
import type { CopyTradeOrigin } from '../../../util/social/copyTradeIntent';

export interface QuickBuyContextValue extends UseQuickBuyControllerResult {
  target: QuickBuyTarget;
  features: QuickBuyFeatures;
  analyticsContext: QuickBuyAnalyticsContext;
  onClose: () => void;
  activeScreen: QuickBuyScreen;
  setActiveScreen: (screen: QuickBuyScreen) => void;
  sellQuickPercentages: QuickBuySellPercentTuple;
  /**
   * Called by the Buy button. A flagged destination token first opens the
   * token warning modal, which continues below on Proceed. When the
   * high-price-impact modal feature is enabled and the active quote exceeds
   * the error threshold, this navigates to the `priceImpactConfirm` screen
   * instead of submitting immediately.
   * Otherwise it delegates directly to `handleConfirm`.
   */
  handleBuy: () => Promise<void>;
  /** Whether the numeric keypad is currently shown. */
  isKeypadOpen: boolean;
  setIsKeypadOpen: (open: boolean) => void;
}

export const QuickBuyContext = createContext<QuickBuyContextValue | null>(null);

interface QuickBuyProviderProps {
  target: QuickBuyTarget;
  onClose: () => void;
  features: QuickBuyFeatures;
  initialTradeMode?: QuickBuyTradeMode;
  analyticsContext: QuickBuyAnalyticsContext;
  postTradeShare?: boolean;
  postTradeShareOwner?: string;
  copyTradeOrigin?: CopyTradeOrigin;
  activeScreen: QuickBuyScreen;
  setActiveScreen: (screen: QuickBuyScreen) => void;
  children: React.ReactNode;
}

export const QuickBuyProvider: React.FC<QuickBuyProviderProps> = ({
  target,
  onClose,
  features,
  initialTradeMode,
  analyticsContext,
  postTradeShare,
  postTradeShareOwner,
  copyTradeOrigin,
  activeScreen,
  setActiveScreen,
  children,
}) => {
  const controller = useQuickBuyController(
    target,
    onClose,
    analyticsContext,
    initialTradeMode,
    postTradeShare,
    copyTradeOrigin,
    postTradeShareOwner,
  );
  // Open the keypad by default so the sheet matches the taller Figma layout
  // (footer + keypad visible together).
  //
  // Deliberately independent of `hasNoPayWithFunds`: gating it on funds made the
  // sheet's height depend on a flag that is not settled on the first render
  // (`usePayWithTokens` options come from several redux slices that can each lag
  // a render), so a funded account opened with the keypad collapsed and then
  // expanded — a visible flash. With no funds the keypad stays expanded and is
  // dimmed/inert alongside the rest of the sheet instead, which keeps the height
  // constant no matter when the flag settles.
  const [isKeypadOpen, setIsKeypadOpen] = useState(true);
  const { isPriceImpactError, isPresetAddFundsMode, handleConfirm } =
    controller;

  const sellQuickPercentages = useMemo(
    () => getDefaultSellQuickPercentages(),
    [],
  );

  const proceedToConfirm = useCallback(async () => {
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

  // The warning modal calls this after it closes, by which time the quote may
  // have refreshed, so it must read the latest version.
  const proceedToConfirmRef = useRef(proceedToConfirm);
  proceedToConfirmRef.current = proceedToConfirm;

  const navigation = useNavigation<AppNavigationProp>();
  const securityData = useSelector(selectDestToken)?.securityData;

  const handleBuy = useCallback(async () => {
    if (
      !isPresetAddFundsMode &&
      securityData &&
      isNegativeSecurityType(securityData.type)
    ) {
      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.TOKEN_WARNING_MODAL,
        params: {
          warningType: securityData.type,
          features: securityData.metadata?.features ?? [],
          mode: TokenWarningModalMode.Execution,
          location: getQuickBuyEntryPoint(analyticsContext.source),
          onProceed: () => proceedToConfirmRef.current(),
        },
      });
      return;
    }
    await proceedToConfirm();
  }, [
    analyticsContext.source,
    isPresetAddFundsMode,
    navigation,
    proceedToConfirm,
    securityData,
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
    sellQuickPercentages,
    handleBuy,
    isKeypadOpen,
    setIsKeypadOpen,
  };

  return (
    <QuickBuyContext.Provider value={value}>
      {children}
    </QuickBuyContext.Provider>
  );
};
