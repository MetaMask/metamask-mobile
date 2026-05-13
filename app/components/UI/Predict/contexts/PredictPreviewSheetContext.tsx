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
let _lastBuyParams: PredictBuyPreviewParams | null = null;
let _isBuySheetVisible = false;
let _openBuySheetFromToast: ((params: PredictBuyPreviewParams) => void) | null =
  null;

/**
 * Returns whether `PredictPreviewSheetProvider` is currently mounted somewhere
 * in the tree.
 */
export function isPredictSheetProviderMounted(): boolean {
  return _providerMounted;
}

/**
 * Returns whether the buy bet slip is currently rendered on screen. Used by
 * `usePredictToastRegistrations` to decide whether to suppress the order
 * failure toast — when the sheet is visible, the inline error banner inside
 * the sheet handles the failure, so the toast would be a duplicate.
 */
export function isPredictBuySheetVisible(): boolean {
  return _isBuySheetVisible;
}

/**
 * Returns the params from the most recent `openBuySheet` call, or `null` if
 * the user has never opened a buy sheet in this session. Used by the failure
 * toast's "Try again" action to know which market to reopen.
 */
export function getPredictLastBuyParams(): PredictBuyPreviewParams | null {
  return _lastBuyParams;
}

/**
 * Reopens the buy bet slip with the most recent params. Used by the failure
 * toast's "Try again" action so the user lands back on the same market with
 * the inline `order_failed` banner already showing.
 */
export function reopenPredictBuySheet(): void {
  if (_openBuySheetFromToast && _lastBuyParams) {
    _openBuySheetFromToast(_lastBuyParams);
  }
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
  const { clearOrderError } = usePredictActiveOrder();

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

  useEffect(() => {
    _providerMounted = true;
    return () => {
      _providerMounted = false;
      _lastBuyParams = null;
      _isBuySheetVisible = false;
      _openBuySheetFromToast = null;
    };
  }, []);

  const openBuySheet = useCallback(
    (params: PredictBuyPreviewParams) => {
      lastBuyParamsRef.current = params;
      _lastBuyParams = params;
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

  // Mirror buy-sheet visibility to a module-level flag so toast handlers
  // outside the React tree can decide whether to suppress a duplicate toast
  // (the inline banner inside the sheet covers errors when it is visible).
  useEffect(() => {
    _isBuySheetVisible = !!buyParams;
  }, [buyParams]);

  // Expose `openBuySheet` to the module-level reopen API consumed by the
  // failure toast's "Try again" action.
  useEffect(() => {
    _openBuySheetFromToast = openBuySheet;
    return () => {
      _openBuySheetFromToast = null;
    };
  }, [openBuySheet]);

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
