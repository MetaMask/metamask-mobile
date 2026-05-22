import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import ToastService from '../../../../core/ToastService';
import { useAppThemeFromContext } from '../../../../util/theme';
import {
  selectPredictWithAnyTokenEnabledFlag,
  selectPredictBottomSheetEnabledFlag,
} from '../selectors/featureFlags';
import {
  PredictBuyPreviewParams,
  PredictSellPreviewParams,
} from '../types/navigation';
import { formatCents, getCashoutInfoText } from '../utils/format';
import PredictPreviewSheet, {
  type PredictPreviewSheetRef,
} from '../components/PredictPreviewSheet/PredictPreviewSheet';
import Engine from '../../../../core/Engine';
import PredictBuyPreview, {
  predictBuyPreviewDismissedViaBackRef,
  predictBuyPreviewOrderInitiatedRef,
  predictBuyPreviewSessionRef,
} from '../views/PredictBuyPreview/PredictBuyPreview';
import PredictBuyWithAnyToken from '../views/PredictBuyWithAnyToken/PredictBuyWithAnyToken';
import PredictSellPreview from '../views/PredictSellPreview/PredictSellPreview';
import { PredictMarketDetailsSelectorsIDs } from '../Predict.testIds';
import { usePredictActiveOrder } from '../hooks/usePredictActiveOrder';
import { PredictDismissalMethod } from '../constants/eventNames';
import { parseAnalyticsProperties } from '../utils/analytics';

// Registration stack of sheet-mode providers — multiple providers can be
// mounted simultaneously (e.g. HomeTabs + PredictScreenStack when the user
// navigates from Explore into Predict), so a single counter cannot tell us
// which one is "active". The top of the stack (most recently mounted, i.e.
// innermost in the tree) is the only provider that should fire its
// state-based Retry toast — earlier-mounted providers stay silent to avoid
// duplicate toasts for the same `activeOrder.error` transition.
interface SheetModeProviderEntry {
  id: number;
  hasBuyParams: () => boolean;
  dismissPreviewSheet: () => void;
}

let _sheetModeProviders: SheetModeProviderEntry[] = [];
let _nextSheetModeProviderId = 0;

function registerSheetModeProvider(
  hasBuyParams: () => boolean,
  dismissPreviewSheet: () => void,
): number {
  const id = ++_nextSheetModeProviderId;
  _sheetModeProviders = [
    ..._sheetModeProviders,
    { id, hasBuyParams, dismissPreviewSheet },
  ];
  return id;
}

function unregisterSheetModeProvider(id: number): void {
  _sheetModeProviders = _sheetModeProviders.filter((entry) => entry.id !== id);
}

function isActiveSheetModeProvider(id: number): boolean {
  return _sheetModeProviders[_sheetModeProviders.length - 1]?.id === id;
}

export function dismissActivePreviewSheet(): void {
  const active = _sheetModeProviders[_sheetModeProviders.length - 1];
  active?.dismissPreviewSheet();
}

/**
 * Returns true only when the active (top-of-stack) sheet-mode provider has
 * remembered buy params and will therefore surface its own Retry toast.
 * Used by `usePredictToastRegistrations` to decide whether to suppress the
 * legacy order-failure toast.
 *
 * Checking `hasBuyParams()` (rather than just "any provider mounted")
 * avoids suppressing the legacy toast when no sheet-mode provider is
 * positioned to fire — e.g. the active provider is HomeTabs but the user
 * just initiated the order via a `disableBottomSheet` provider that
 * shadowed it (so the outer never had `openBuySheet` called on it).
 *
 * Note: a provider mounted with `disableBottomSheet` does NOT register,
 * because it never shows the Retry sheet.
 */
export function shouldSuppressLegacyOrderFailureToast(): boolean {
  const top = _sheetModeProviders[_sheetModeProviders.length - 1];
  return Boolean(top?.hasBuyParams());
}

const SellSheetHeader: React.FC<{ params: PredictSellPreviewParams }> = ({
  params,
}) => {
  const tw = useTailwind();
  const position = params.position;
  const outcomeGroupTitle = params.outcome?.groupItemTitle ?? '';
  const outcomeToken = params.outcome?.tokens?.find(
    (t) => t.id === position?.outcomeTokenId,
  );
  const outcomeSideText = outcomeToken?.title ?? position?.outcome ?? '';

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3 flex-1 min-w-0"
    >
      {position?.icon && (
        <Image
          source={{ uri: position.icon }}
          style={tw.style('w-10 h-10 rounded')}
        />
      )}
      <Box twClassName="flex-1 min-w-0">
        <Text
          variant={TextVariant.HeadingSm}
          numberOfLines={1}
          ellipsizeMode="tail"
          testID="sell-sheet-header-title"
        >
          {position?.title ?? strings('predict.cash_out')}
        </Text>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          variant={TextVariant.BodySm}
          twClassName="font-medium"
          color={TextColor.TextAlternative}
        >
          {getCashoutInfoText({
            initialValue: position?.initialValue ?? 0,
            avgPrice: position?.avgPrice ?? 0,
            outcomeSideText,
            outcomeGroupTitle,
          })}
        </Text>
      </Box>
    </Box>
  );
};

interface PredictPreviewSheetContextValue {
  openBuySheet: (params: PredictBuyPreviewParams) => void;
  openSellSheet: (params: PredictSellPreviewParams) => void;
  dismissPreviewSheet: () => void;
}

const PredictPreviewSheetContext = createContext<
  PredictPreviewSheetContextValue | undefined
>(undefined);

/**
 * Returns the sheet context when inside PredictPreviewSheetProvider,
 * otherwise falls back to navigation-based routing so components rendered
 * outside PredictScreenStack (e.g. home carousel, trending feed) don't crash.
 */
export const usePredictPreviewSheet = (): PredictPreviewSheetContextValue => {
  const ctx = useContext(PredictPreviewSheetContext);
  const navigation = useNavigation();

  const fallback = useMemo(
    () => ({
      openBuySheet: (params: PredictBuyPreviewParams) => {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
          params,
        });
      },
      openSellSheet: (params: PredictSellPreviewParams) => {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.SELL_PREVIEW,
          params,
        });
      },
      dismissPreviewSheet: () => undefined,
    }),
    [navigation],
  );

  return ctx ?? fallback;
};

interface PredictPreviewSheetProviderProps {
  children: React.ReactNode;
  /**
   * When true, always navigate to the full-screen bet slip instead of opening
   * the bottom sheet. Required when the provider is rendered inside
   * HomepageDiscoveryTabs, where the sheet is obscured by the tab layout.
   *
   * This prop exists solely to support the Hub Page Discovery Tabs A/B test
   * (LD flag: `coreMCU589AbtestHubPageDiscoveryTabs`). If that feature is
   * scrapped or fully rolled out and this layout is no longer needed, this prop
   * can be removed along with the HomepageDiscoveryTabs component.
   *
   * Contact @metamask-core-mobile-ux for questions about the flag or rollout.
   */
  disableBottomSheet?: boolean;
}

export const PredictPreviewSheetProvider: React.FC<
  PredictPreviewSheetProviderProps
> = ({ children, disableBottomSheet = false }) => {
  const navigation = useNavigation();
  const bottomSheetEnabled = useSelector(selectPredictBottomSheetEnabledFlag);
  const payWithAnyTokenEnabled = useSelector(
    selectPredictWithAnyTokenEnabledFlag,
  );
  const { activeOrder, clearOrderError } = usePredictActiveOrder();
  const theme = useAppThemeFromContext();

  const buySheetRef = useRef<PredictPreviewSheetRef>(null);
  const sellSheetRef = useRef<PredictPreviewSheetRef>(null);
  const [buyParams, setBuyParams] = useState<PredictBuyPreviewParams | null>(
    null,
  );
  const [sellParams, setSellParams] = useState<PredictSellPreviewParams | null>(
    null,
  );
  const buyNonceRef = useRef(0);
  const sellNonceRef = useRef(0);
  const [buyNonce, setBuyNonce] = useState(0);
  const [sellNonce, setSellNonce] = useState(0);

  /**
   * Remembers the last params passed to `openBuySheet` so the failure toast's
   * "Try again" action can reopen the sheet with the same market context.
   */
  const lastBuyParamsRef = useRef<PredictBuyPreviewParams | null>(null);

  /**
   * Holds the latest theme so the failure-toast effect can read its colors
   * without listing them as deps (which would re-run the effect on theme
   * changes and risk re-firing the toast for a still-truthy error).
   */
  const themeRef = useRef(theme);
  themeRef.current = theme;

  /**
   * Pending timer that auto-clears `activeOrder.error` after the failure
   * toast finishes auto-dismissing (~3s — `visibilityDuration` 2750ms +
   * exit animation in `Toast.tsx`). Cancelled when the user taps Retry
   * (so the reopened slip surfaces the error banner) and on unmount (so
   * we don't fire `clearOrderError` after teardown).
   */
  const clearErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Module-level registration id for this provider instance. Set on mount
   * (when not disabled) and used to guard the failure-toast effect so only
   * the topmost (most recently mounted) provider fires.
   */
  const providerIdRef = useRef<number | null>(null);
  const hasBuyParams = useCallback(() => lastBuyParamsRef.current !== null, []);

  useEffect(() => {
    if (!disableBottomSheet) {
      providerIdRef.current = registerSheetModeProvider(hasBuyParams, () =>
        setBuyParams(null),
      );
    }
    return () => {
      if (providerIdRef.current !== null) {
        unregisterSheetModeProvider(providerIdRef.current);
        providerIdRef.current = null;
      }
      if (clearErrorTimerRef.current) {
        clearTimeout(clearErrorTimerRef.current);
        clearErrorTimerRef.current = null;
      }
    };
  }, [disableBottomSheet, hasBuyParams]);

  const openBuySheet = useCallback(
    (params: PredictBuyPreviewParams) => {
      if (bottomSheetEnabled && !disableBottomSheet) {
        lastBuyParamsRef.current = params;
        setBuyParams(params);
        buyNonceRef.current += 1;
        setBuyNonce(buyNonceRef.current);
      } else {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
          params: disableBottomSheet
            ? { ...params, trackSwipeDismiss: true }
            : params,
        });
      }
    },
    [bottomSheetEnabled, disableBottomSheet, navigation],
  );

  const openSellSheet = useCallback(
    (params: PredictSellPreviewParams) => {
      if (bottomSheetEnabled && !disableBottomSheet) {
        setSellParams(params);
        sellNonceRef.current += 1;
        setSellNonce(sellNonceRef.current);
      } else {
        // No trackSwipeDismiss here — PredictSellPreview has no beforeRemove
        // swipe-dismiss tracking, so the param would be unused.
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.SELL_PREVIEW,
          params,
        });
      }
    },
    [bottomSheetEnabled, disableBottomSheet, navigation],
  );

  const dismissPreviewSheet = useCallback(() => {
    setBuyParams(null);
  }, []);

  useEffect(() => {
    if (buyParams) {
      buySheetRef.current?.onOpenBottomSheet();
    }
  }, [buyParams, buyNonce]);

  useEffect(() => {
    if (sellParams) {
      sellSheetRef.current?.onOpenBottomSheet();
    }
  }, [sellParams, sellNonce]);

  // State-based trigger for the "Try again" failure toast. Mirrors the
  // original auto-reopen condition (which fired whenever `activeOrder.error`
  // transitioned to truthy while the sheet was dismissed and we still had
  // remembered buy params) — but instead of reopening the sheet uninvited,
  // surfaces a Try again toast that the user can opt into. Using a state
  // trigger here is more reliable than the controller's `'failed'` event,
  // which depends on `isBackgroundOrder` being true (subject to a race
  // between the slip's unmount cleanup and on-chain confirmation).
  const previousErrorRef = useRef<string | undefined>(activeOrder?.error);
  useEffect(() => {
    const currentError = activeOrder?.error;
    const previousError = previousErrorRef.current;
    previousErrorRef.current = currentError;

    // Only fire on falsy -> truthy transition.
    if (!currentError || previousError) {
      return;
    }
    // Only for the bottom-sheet flow, with the slip closed, and only if we
    // know which params to reopen with. Note: lastBuyParamsRef is only set in
    // sheet mode, so the !lastBuyParamsRef.current guard is redundant when
    // disableBottomSheet is true — but both are kept for clarity.
    if (
      !bottomSheetEnabled ||
      disableBottomSheet ||
      buyParams ||
      !lastBuyParamsRef.current
    ) {
      return;
    }

    // When multiple sheet-mode providers are mounted simultaneously (e.g.
    // HomeTabs + PredictScreenStack while the user is inside the Predict
    // stack), only the topmost (most recently mounted, innermost in the
    // tree) provider should fire the toast — earlier-mounted providers
    // also hold their own `lastBuyParamsRef` and would otherwise duplicate
    // the toast (and the `clearOrderError` timer).
    if (
      providerIdRef.current === null ||
      !isActiveSheetModeProvider(providerIdRef.current)
    ) {
      return;
    }

    const lastParams = lastBuyParamsRef.current;
    // Use `closeButtonOptions` (with `ButtonVariants.Link`) rather than
    // `linkButtonOptions` so the Retry sits inline on the right of the row
    // (`[icon] [label] [Retry]`) instead of stacked below the label. This
    // matches the deposit "Adding funds / Track" toast convention.
    ToastService.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [
        {
          label: strings('predict.order.prediction_failed'),
          isBold: true,
        },
      ],
      // The description provides useful context AND makes the labels
      // container two lines tall — same height as the Retry Primary
      // button — so the row's `alignItems: flex-start` produces a
      // visually-balanced layout (matches the deposit/Track toast).
      descriptionOptions: {
        description: strings('predict.order.order_failed_generic'),
      },
      iconName: IconName.Error,
      iconColor: themeRef.current.colors.error.default,
      backgroundColor: themeRef.current.colors.error.muted,
      hasNoTimeout: false,
      closeButtonOptions: {
        label: strings('predict.order.retry'),
        variant: ButtonVariants.Link,
        onPress: () => {
          if (clearErrorTimerRef.current) {
            clearTimeout(clearErrorTimerRef.current);
            clearErrorTimerRef.current = null;
          }
          openBuySheet(lastParams);
        },
      },
    });

    // Toast auto-dismisses on the platform default (~2.75s visibility +
    // ~250ms exit anim). When that finishes without the user tapping
    // Retry, clear the error so the next slip open is clean (no banner).
    // Tapping Retry cancels this timer so the reopened slip can show the
    // banner explaining what went wrong.
    if (clearErrorTimerRef.current) {
      clearTimeout(clearErrorTimerRef.current);
    }
    clearErrorTimerRef.current = setTimeout(() => {
      clearErrorTimerRef.current = null;
      clearOrderError();
    }, 3000);
  }, [
    activeOrder?.error,
    buyParams,
    bottomSheetEnabled,
    disableBottomSheet,
    openBuySheet,
    clearOrderError,
  ]);

  const BuyComponent = useMemo(
    () => (payWithAnyTokenEnabled ? PredictBuyWithAnyToken : PredictBuyPreview),
    [payWithAnyTokenEnabled],
  );

  const onBuyDismiss = useCallback(() => {
    // Fire Predict Betslip Dismissed for swipe / hardware-back paths.
    // Skip if: the back-button handler already fired it, or the sheet is
    // closing because the user confirmed an order (not a dismissal).
    if (
      !predictBuyPreviewDismissedViaBackRef.current &&
      !predictBuyPreviewOrderInitiatedRef.current &&
      buyParams
    ) {
      const dismissAnalyticsProperties = parseAnalyticsProperties(
        buyParams.market,
        buyParams.outcomeToken,
        buyParams.entryPoint,
      );
      Engine.context.PredictController.trackBetslipDismissed({
        analyticsProperties: dismissAnalyticsProperties,
        dismissalMethod: PredictDismissalMethod.SWIPE,
        hadEnteredAmount: predictBuyPreviewSessionRef.hadEnteredAmount,
        timeOnScreenMs: Date.now() - predictBuyPreviewSessionRef.mountTimestamp,
        activeAbTests: buyParams.transactionActiveAbTests,
      });
    }
    predictBuyPreviewDismissedViaBackRef.current = false;
    predictBuyPreviewOrderInitiatedRef.current = false;

    setBuyParams(null);
    clearOrderError();
  }, [clearOrderError, buyParams]);
  const onSellDismiss = useCallback(() => setSellParams(null), []);

  const contextValue = React.useMemo(
    () => ({ openBuySheet, openSellSheet, dismissPreviewSheet }),
    [openBuySheet, openSellSheet, dismissPreviewSheet],
  );

  return (
    <PredictPreviewSheetContext.Provider value={contextValue}>
      {children}
      {bottomSheetEnabled && buyParams && (
        <PredictPreviewSheet
          ref={buySheetRef}
          isFullscreen={false}
          title={[
            buyParams.outcomeToken?.title,
            buyParams.outcome?.groupItemTitle || buyParams.outcome?.title,
          ]
            .filter(Boolean)
            .join(' · ')}
          image={buyParams.outcome?.image}
          subtitle={
            buyParams.outcomeToken
              ? `${strings('predict.odds')} ${formatCents(buyParams.outcomeToken.price ?? 0)}`
              : undefined
          }
          onDismiss={onBuyDismiss}
          testID={PredictMarketDetailsSelectorsIDs.BUY_PREVIEW_SHEET}
        >
          {(closeSheet) => (
            <BuyComponent mode="sheet" {...buyParams} onClose={closeSheet} />
          )}
        </PredictPreviewSheet>
      )}
      {bottomSheetEnabled && sellParams && (
        <PredictPreviewSheet
          ref={sellSheetRef}
          isFullscreen={false}
          renderHeader={() => <SellSheetHeader params={sellParams} />}
          onDismiss={onSellDismiss}
          testID={PredictMarketDetailsSelectorsIDs.SELL_PREVIEW_SHEET}
        >
          {(closeSheet) => (
            <PredictSellPreview
              mode="sheet"
              {...sellParams}
              onClose={closeSheet}
            />
          )}
        </PredictPreviewSheet>
      )}
    </PredictPreviewSheetContext.Provider>
  );
};
