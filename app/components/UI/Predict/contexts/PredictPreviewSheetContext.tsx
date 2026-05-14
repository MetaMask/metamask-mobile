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
let _providerInSheetMode = false;

/**
 * Returns whether `PredictPreviewSheetProvider` is mounted AND will actually
 * open a bottom sheet (i.e. not in disableBottomSheet mode). Used by
 * `usePredictToastRegistrations` to suppress the order-failure toast when the
 * provider will auto-reopen the sheet with an inline error banner instead.
 */
export function isPredictSheetProviderMounted(): boolean {
  return _providerMounted && _providerInSheetMode;
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
   * Remembers the last params passed to `openBuySheet` so we can auto-reopen
   * the sheet when an order fails in the background after the sheet was
   * dismissed (e.g. closed during DEPOSITING).
   */
  const lastBuyParamsRef = useRef<PredictBuyPreviewParams | null>(null);
  /**
   * Set when the user dismisses the sheet while an error is already visible.
   * Prevents the auto-reopen effect from re-triggering the sheet before
   * `clearOrderError` has propagated through Redux. Reset once the error
   * becomes falsy (i.e. the clear has landed).
   */
  const dismissedWithErrorRef = useRef(false);

  useEffect(() => {
    _providerMounted = true;
    _providerInSheetMode = !disableBottomSheet;
    return () => {
      _providerMounted = false;
      _providerInSheetMode = false;
    };
  }, [disableBottomSheet]);

  const openBuySheet = useCallback(
    (params: PredictBuyPreviewParams) => {
      lastBuyParamsRef.current = params;
      if (bottomSheetEnabled && !disableBottomSheet) {
        setBuyParams(params);
        buyNonceRef.current += 1;
        setBuyNonce(buyNonceRef.current);
      } else {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
          params,
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
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.SELL_PREVIEW,
          params,
        });
      }
    },
    [bottomSheetEnabled, disableBottomSheet, navigation],
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

  // Auto-reopen the buy sheet when a background order fails so the user can
  // see the inline error banner and retry instead of getting a toast.
  useEffect(() => {
    if (!activeOrder?.error) {
      dismissedWithErrorRef.current = false;
    }

    if (
      bottomSheetEnabled &&
      !disableBottomSheet &&
      activeOrder?.error &&
      !buyParams &&
      lastBuyParamsRef.current &&
      !dismissedWithErrorRef.current
    ) {
      const savedParams = lastBuyParamsRef.current;
      lastBuyParamsRef.current = null;
      setBuyParams(savedParams);
      buyNonceRef.current += 1;
      setBuyNonce(buyNonceRef.current);
    }
  }, [activeOrder?.error, buyParams, bottomSheetEnabled, disableBottomSheet]);

  const BuyComponent = useMemo(
    () => (payWithAnyTokenEnabled ? PredictBuyWithAnyToken : PredictBuyPreview),
    [payWithAnyTokenEnabled],
  );

  const onBuyDismiss = useCallback(() => {
    if (activeOrder?.error) {
      dismissedWithErrorRef.current = true;
    }

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
  }, [clearOrderError, activeOrder?.error, buyParams]);
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
