import type { TrendingAsset } from '@metamask/assets-controllers';
import { useEffect, useRef } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Explore surfaces that combine inline search with the Quick Buy sheet —
 * keeps the search keyboard and bottom sheet mutually exclusive:
 * - opening Quick Buy dismisses the search keyboard
 * - showing the search keyboard closes Quick Buy
 */
export function useQuickBuySearchKeyboard(
  quickTradeToken: TrendingAsset | null,
  closeQuickBuy: () => void,
): void {
  const quickTradeTokenRef = useRef(quickTradeToken);
  quickTradeTokenRef.current = quickTradeToken;

  const closeQuickBuyRef = useRef(closeQuickBuy);
  closeQuickBuyRef.current = closeQuickBuy;

  useEffect(() => {
    if (quickTradeToken) {
      Keyboard.dismiss();
    }
  }, [quickTradeToken]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';

    const subscription = Keyboard.addListener(showEvent, () => {
      if (quickTradeTokenRef.current) {
        closeQuickBuyRef.current();
      }
    });

    return () => subscription.remove();
  }, []);
}
