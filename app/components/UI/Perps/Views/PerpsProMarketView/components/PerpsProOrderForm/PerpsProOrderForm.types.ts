import type { OrderType } from '@metamask/perps-controller';
import type { PerpsProSizeUnit } from './usePerpsProSizeInput';
export type PerpsProOrderDirection = 'long' | 'short';
export interface PerpsProOrderNotice {
  id: string;
  variant: 'banner' | 'inline';
  title?: string;
  message: string;
}
export interface PerpsProOrderSummaryProps {
  margin: string;
  liquidationPrice: string;
  slippage?: string;
  fee?: number;
  originalFee?: number;
  feeDiscountPercentage?: number;
  onSlippagePress?: () => void;
  onFeesInfoPress?: () => void;
}
export interface PerpsProOrderFormProps {
  direction: PerpsProOrderDirection;
  onDirectionChange: (direction: PerpsProOrderDirection) => void;
  /**
   * When true, an order-book icon renders beside the direction control to
   * restore the collapsed order-book column (Figma "No Order Book" state).
   */
  isOrderBookCollapsed?: boolean;
  onExpandOrderBook?: () => void;
  marginModeLabel: string;
  leverageLabel: string;
  onLeveragePress?: () => void;
  orderType: OrderType;
  onOrderTypeButtonPress: () => void;
  limitPrice: string;
  onLimitPriceChange: (value: string) => void;
  onUseMidPricePress?: () => void;
  size: string;
  onSizeChange: (value: string) => void;
  sizeUnit?: PerpsProSizeUnit;
  sizeUnitLabel?: string;
  showUsdPrefix?: boolean;
  canToggleSizeUnit?: boolean;
  onSizeFocus?: () => void;
  onSizeBlur?: () => void;
  onSizeUnitPress?: () => void;
  balancePercentage: number;
  onBalancePercentageChange: (value: number) => void;
  onBalancePercentageDragEnd?: () => void;
  onBalancePercentageDragCancel?: () => void;
  availableBalance: string;
  onAddFundsPress?: () => void;
  reduceOnly: boolean;
  onReduceOnlyChange: (value: boolean) => void;
  isTPSLConfigured: boolean;
  onTPSLPress?: () => void;
  notices: PerpsProOrderNotice[];
  summary: PerpsProOrderSummaryProps;
  placeOrderLabel: string;
  placeOrderIntent: PerpsProOrderDirection;
  isPlaceOrderDisabled?: boolean;
  isPlaceOrderLoading?: boolean;
  onPlaceOrderPress: () => void;
}
