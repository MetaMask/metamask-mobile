import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BridgeRouteParams } from '../hooks/useSwapBridgeNavigation';
import type { BridgeTokenSelectorRouteParams } from '../components/BridgeTokenSelector/BridgeTokenSelector';
import type { BatchSellTokenSelectRouteParams } from '../Views/BatchSellTokenSelect/types';
import type { HardwareWalletsSwapsRouteParams } from '../../HardwareWallet/Swaps/flowStrategy';
import type { HwQrScannerRouteParams } from '../../HardwareWallet/Swaps/HwQrScanner';
import type {
  BatchSellSlippageModalParams,
  SwapSlippageModalParams,
} from '../components/SlippageModal/types';
import type {
  BlockaidModalParams,
  TransactionDetailsBlockExplorerParams,
} from '../Bridge.types';
import type { PriceImpactModalRouterParams } from '../components/PriceImpactModal/types';
import type { MissingPriceModalParams } from '../components/MissingPriceModal';
import type { TokenWarningModalParams } from '../components/TokenWarningModal';
import type { HighRateAlertModalParams } from '../components/HighRateAlertModal';
import type { PostTradeBottomSheetParams } from '../components/PostTradeBottomSheet/PostTradeBottomSheet.types';
import type { BatchSellPriceImpactInfoModalParams } from '../components/BatchSellPriceImpactInfoModal/BatchSellPriceImpactInfoModal.types';
import type { BatchSellNetworkFeeInfoModalParams } from '../components/BatchSellNetworkFeeInfoModal/BatchSellNetworkFeeInfoModal.types';
import type { BatchSellMinimumReceivedInfoModalParams } from '../components/BatchSellMinimumReceivedInfoModal/BatchSellMinimumReceivedInfoModal.types';

/**
 * Param list for screens inside the Bridge screen stack (`BridgeScreenStack`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BridgeScreensStackParamList = {
  BridgeView: BridgeRouteParams | undefined;
  BridgeTokenSelector: BridgeTokenSelectorRouteParams | undefined;
  BatchSellTokenSelect: BatchSellTokenSelectRouteParams | undefined;
  BatchSellReview: undefined;
  QuoteSelectorView: undefined;
  HardwareWalletsSwaps: HardwareWalletsSwapsRouteParams | undefined;
  HwQrScanner: HwQrScannerRouteParams | undefined;
};

/**
 * Param list for screens inside the Bridge modal stack (`BridgeModalStack`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BridgeModalsNavigationParamList = {
  SwapDefaultSlippageModal: SwapSlippageModalParams | undefined;
  SwapCustomSlippageModal: SwapSlippageModalParams | undefined;
  BatchSellDefaultSlippageModal: BatchSellSlippageModalParams | undefined;
  BatchSellCustomSlippageModal: BatchSellSlippageModalParams | undefined;
  TransactionDetailsBlockExplorer:
    | TransactionDetailsBlockExplorerParams
    | undefined;
  BlockaidModal: BlockaidModalParams;
  RecipientSelectorModal: undefined;
  MarketClosedModal: undefined;
  NetworkListModal: undefined;
  PriceImpactModal: PriceImpactModalRouterParams;
  MissingPriceModal: MissingPriceModalParams;
  TokenWarningModal: TokenWarningModalParams;
  HighRateAlertModal: HighRateAlertModalParams;
  PostTradeModal: PostTradeBottomSheetParams;
  BatchSellDestinationTokenSelectorModal: undefined;
  BatchSellQuoteDetailsModal: undefined;
  BatchSellFinalReviewModal: undefined;
  BatchSellNetworkFeeInfoModal: BatchSellNetworkFeeInfoModalParams | undefined;
  BatchSellMinimumReceivedInfoModal:
    | BatchSellMinimumReceivedInfoModalParams
    | undefined;
  BatchSellPriceImpactInfoModal: BatchSellPriceImpactInfoModalParams;
};

/**
 * Feature-level Bridge navigation params for nested `Bridge` / `BridgeModals` entry.
 */
// Intersection (`&`) requires `type`; `interface` cannot express this.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BridgeNavigationParamList = BridgeScreensStackParamList &
  BridgeModalsNavigationParamList & {
    Bridge: NavigatorScreenParams<BridgeScreensStackParamList> | undefined;
    BridgeModals:
      | NavigatorScreenParams<BridgeModalsNavigationParamList>
      | undefined;
  };
