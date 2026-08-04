import type { OrderType } from '@metamask/perps-controller';

export type PerpsProOrderDirection = 'long' | 'short';

/**
 * Active size-denomination for the Pro order form size field.
 * USD is the canonical controller amount; asset is a UI conversion view.
 */
export type PerpsProSizeDenomination =
  | { unit: 'usd' }
  | { unit: 'asset'; symbol: string };

/**
 * Editable size field state and handlers for the Pro order form.
 */
export interface PerpsProSizeInputModel {
  value: string;
  denomination: PerpsProSizeDenomination;
  canToggleDenomination: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onToggleDenomination: () => void;
}

/**
 * Amount-domain size slider, matching Lite's USD amount / maxPossibleAmount
 * controlled range rather than a Pro-only percentage adapter.
 */
export interface PerpsProSizeSliderModel {
  value: number;
  maximumValue: number;
  onValueChange: (value: number) => void;
  onDragEnd: () => void;
  onDragCancel: () => void;
}

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
  onLimitPriceBlur?: () => void;
  onUseMidPricePress?: () => void;
  sizeInput: PerpsProSizeInputModel;
  sizeSlider: PerpsProSizeSliderModel;
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
