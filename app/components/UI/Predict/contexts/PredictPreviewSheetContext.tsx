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
import PredictBuyPreview from '../views/PredictBuyPreview/PredictBuyPreview';
import PredictBuyWithAnyToken from '../views/PredictBuyWithAnyToken/PredictBuyWithAnyToken';
import PredictSellPreview from '../views/PredictSellPreview/PredictSellPreview';
import { PredictMarketDetailsSelectorsIDs } from '../Predict.testIds';
import { usePredictActiveOrder } from '../hooks/usePredictActiveOrder';

let _providerMounted = false;

/**
 * Returns whether `PredictPreviewSheetProvider` is currently mounted somewhere
 * in the tree. Used by `usePredictToastRegistrations` to decide whether to
 * suppress the order-failure toast (the provider auto-reopens the sheet with
 * an inline error banner instead).
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
    return () => {
      _providerMounted = false;
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

  // Auto-reopen the buy sheet when a background order fails so the user can
  // see the inline error banner and retry instead of getting a toast.
  useEffect(() => {
    if (!activeOrder?.error) {
      dismissedWithErrorRef.current = false;
    }

    if (
      bottomSheetEnabled &&
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
  }, [activeOrder?.error, buyParams, bottomSheetEnabled]);

  const BuyComponent = useMemo(
    () => (payWithAnyTokenEnabled ? PredictBuyWithAnyToken : PredictBuyPreview),
    [payWithAnyTokenEnabled],
  );

  const onBuyDismiss = useCallback(() => {
    if (activeOrder?.error) {
      dismissedWithErrorRef.current = true;
    }
    setBuyParams(null);
    clearOrderError();
  }, [clearOrderError, activeOrder?.error]);
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
