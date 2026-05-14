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
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { ButtonIconVariant } from '../../../../component-library/components/Toast/Toast.types';
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

let _providerMounted = false;

/**
 * Returns whether `PredictPreviewSheetProvider` is currently mounted somewhere
 * in the tree. Used by `usePredictToastRegistrations` to decide whether to
 * suppress the order failure toast — when the provider is mounted, its
 * state-based trigger surfaces a persistent Retry toast and the legacy plain
 * toast would be a duplicate.
 */
export function isPredictSheetProviderMounted(): boolean {
  return _providerMounted;
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
    }),
    [navigation],
  );

  return ctx ?? fallback;
};

interface PredictPreviewSheetProviderProps {
  children: React.ReactNode;
}

export const PredictPreviewSheetProvider: React.FC<
  PredictPreviewSheetProviderProps
> = ({ children }) => {
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
   * Tracks whether the Retry toast we showed is still visible. Used by the
   * unmount cleanup to dismiss only OUR toast (not a deposit / withdraw /
   * other-feature toast that may be on screen). Set to true when the
   * state-based trigger calls `ToastService.showToast`, set back to false
   * when the user taps Retry or Close, or when we dismiss it on unmount.
   */
  const retryToastVisibleRef = useRef(false);

  useEffect(() => {
    _providerMounted = true;
    return () => {
      _providerMounted = false;
      // Dismiss any lingering Retry toast so its onPress closures don't try
      // to setState on the now-unmounted provider. Only close if we know our
      // toast is still up — otherwise we'd risk dismissing another feature's
      // toast that has since replaced ours.
      if (retryToastVisibleRef.current) {
        retryToastVisibleRef.current = false;
        try {
          ToastService.closeToast();
        } catch {
          // Toast layer is no longer available (e.g. app shutdown / hot
          // reload). Nothing to dismiss; safe to ignore.
        }
      }
    };
  }, []);

  const openBuySheet = useCallback(
    (params: PredictBuyPreviewParams) => {
      lastBuyParamsRef.current = params;
      if (bottomSheetEnabled) {
        setBuyParams(params);
        buyNonceRef.current += 1;
        setBuyNonce(buyNonceRef.current);
      } else {
        navigation.navigate(Routes.PREDICT.MODALS.BUY_PREVIEW, params);
      }
    },
    [bottomSheetEnabled, navigation],
  );

  const openSellSheet = useCallback(
    (params: PredictSellPreviewParams) => {
      if (bottomSheetEnabled) {
        setSellParams(params);
        sellNonceRef.current += 1;
        setSellNonce(sellNonceRef.current);
      } else {
        navigation.navigate(Routes.PREDICT.MODALS.SELL_PREVIEW, params);
      }
    },
    [bottomSheetEnabled, navigation],
  );

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
    // know which params to reopen with.
    if (!bottomSheetEnabled || buyParams || !lastBuyParamsRef.current) {
      return;
    }

    const lastParams = lastBuyParamsRef.current;
    ToastService.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [
        {
          label: strings('predict.order.prediction_failed'),
          isBold: true,
        },
      ],
      iconName: IconName.Error,
      iconColor: IconColor.Error,
      backgroundColor: themeRef.current.colors.accent04.normal,
      hasNoTimeout: true,
      compact: true,
      linkButtonOptions: {
        label: strings('predict.order.retry'),
        onPress: () => {
          retryToastVisibleRef.current = false;
          openBuySheet(lastParams);
          ToastService.closeToast();
        },
      },
      closeButtonOptions: {
        variant: ButtonIconVariant.Icon,
        iconName: IconName.Close,
        onPress: () => {
          retryToastVisibleRef.current = false;
          clearOrderError();
          ToastService.closeToast();
        },
      },
    });
    retryToastVisibleRef.current = true;
  }, [
    activeOrder?.error,
    buyParams,
    bottomSheetEnabled,
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
    () => ({ openBuySheet, openSellSheet }),
    [openBuySheet, openSellSheet],
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
