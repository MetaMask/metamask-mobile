import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
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
import { formatCents } from '../utils/format';
import PredictPreviewSheet, {
  type PredictPreviewSheetRef,
} from '../components/PredictPreviewSheet/PredictPreviewSheet';
import PredictBuyPreview from '../views/PredictBuyPreview/PredictBuyPreview';
import PredictBuyWithAnyToken from '../views/PredictBuyWithAnyToken/PredictBuyWithAnyToken';
import PredictSellPreview from '../views/PredictSellPreview/PredictSellPreview';
import { PredictMarketDetailsSelectorsIDs } from '../Predict.testIds';

interface PredictPreviewSheetContextValue {
  openBuySheet: (params: PredictBuyPreviewParams) => void;
  openSellSheet: (params: PredictSellPreviewParams) => void;
}

const PredictPreviewSheetContext = createContext<
  PredictPreviewSheetContextValue | undefined
>(undefined);

export const usePredictPreviewSheet = (): PredictPreviewSheetContextValue => {
  const ctx = useContext(PredictPreviewSheetContext);
  if (!ctx) {
    throw new Error(
      'usePredictPreviewSheet must be used within a PredictPreviewSheetProvider',
    );
  }
  return ctx;
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

  const buySheetRef = useRef<PredictPreviewSheetRef>(null);
  const sellSheetRef = useRef<PredictPreviewSheetRef>(null);
  const [buyParams, setBuyParams] = useState<PredictBuyPreviewParams | null>(
    null,
  );
  const [sellParams, setSellParams] = useState<PredictSellPreviewParams | null>(
    null,
  );

  const openBuySheet = useCallback(
    (params: PredictBuyPreviewParams) => {
      if (bottomSheetEnabled) {
        setBuyParams(params);
      } else {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
          params,
        });
      }
    },
    [bottomSheetEnabled, navigation],
  );

  const openSellSheet = useCallback(
    (params: PredictSellPreviewParams) => {
      if (bottomSheetEnabled) {
        setSellParams(params);
      } else {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.SELL_PREVIEW,
          params,
        });
      }
    },
    [bottomSheetEnabled, navigation],
  );

  useEffect(() => {
    if (buyParams) {
      buySheetRef.current?.onOpenBottomSheet();
    }
  }, [buyParams]);

  useEffect(() => {
    if (sellParams) {
      sellSheetRef.current?.onOpenBottomSheet();
    }
  }, [sellParams]);

  const BuyComponent = payWithAnyTokenEnabled
    ? PredictBuyWithAnyToken
    : PredictBuyPreview;

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
          title={buyParams.outcome?.title}
          image={buyParams.outcome?.image}
          subtitle={
            buyParams.outcomeToken
              ? `${buyParams.outcomeToken.title} ${formatCents(buyParams.outcomeToken.price ?? 0)}`
              : undefined
          }
          onDismiss={() => setBuyParams(null)}
          testID={PredictMarketDetailsSelectorsIDs.BUY_PREVIEW_SHEET}
        >
          {(closeSheet) => <BuyComponent {...buyParams} onClose={closeSheet} />}
        </PredictPreviewSheet>
      )}
      {bottomSheetEnabled && sellParams && (
        <PredictPreviewSheet
          ref={sellSheetRef}
          title={sellParams.position?.title ?? strings('predict.cash_out')}
          image={sellParams.position?.icon}
          subtitle={
            sellParams.position
              ? `${sellParams.position.outcome} ${formatCents(sellParams.position.price ?? 0)}`
              : undefined
          }
          onDismiss={() => setSellParams(null)}
          testID={PredictMarketDetailsSelectorsIDs.SELL_PREVIEW_SHEET}
        >
          {(closeSheet) => (
            <PredictSellPreview {...sellParams} onClose={closeSheet} />
          )}
        </PredictPreviewSheet>
      )}
    </PredictPreviewSheetContext.Provider>
  );
};
