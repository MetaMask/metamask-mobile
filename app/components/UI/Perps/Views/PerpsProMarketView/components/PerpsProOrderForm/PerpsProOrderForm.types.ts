import type { OrderType } from '@metamask/perps-controller';
import type { Ref } from 'react';
import type { View } from 'react-native';

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
  onDragEnd: (value: number) => void;
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

export interface PerpsProTwapModel {
  days: string;
  hours: string;
  minutes: string;
  randomize: boolean;
  onDaysChange: (value: string) => void;
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  onRandomizeChange: (value: boolean) => void;
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
  /** Called when the user taps the Isolated margin-mode chip. */
  onMarginModePress?: () => void;
  leverageLabel: string;
  onLeveragePress?: () => void;
  orderType: OrderType;
  onOrderTypeButtonPress: () => void;
  limitPrice: string;
  onLimitPriceChange: (value: string) => void;
  onLimitPriceFocus?: () => void;
  onLimitPriceBlur?: () => void;
  /**
   * Forwarded to the order-type card — which holds the limit price row, and
   * later the trigger price row — so it can be measured for keyboard clearance.
   */
  orderTypeCardRef?: Ref<View>;
  /** Fires on every limit price field tap, including while already focused. */
  onLimitPriceFieldPress?: () => void;
  onUseMidPricePress?: () => void;
  triggerPrice?: string;
  onTriggerPriceChange?: (value: string) => void;
  onTriggerPriceFocus?: () => void;
  onTriggerPriceBlur?: () => void;
  onTriggerPriceFieldPress?: () => void;
  /**
   * Helper or warning shown under the grouped price card after blur.
   * Error blocks the CTA; warning does not.
   */
  priceCardMessage?: {
    severity: 'error' | 'warning';
    message: string;
  };
  sizeInput: PerpsProSizeInputModel;
  sizeSlider: PerpsProSizeSliderModel;
  /** Forwarded to the size card so it can be measured for keyboard clearance. */
  sizeCardRef?: Ref<View>;
  /** Fires on every size-field tap, including while already focused. */
  onSizeFieldPress?: () => void;
  availableBalance: string;
  onAddFundsPress?: () => void;
  reduceOnly: boolean;
  onReduceOnlyChange: (value: boolean) => void;
  twap: PerpsProTwapModel;
  /** Forwarded to the TWAP section for keyboard-clearance measurement. */
  twapSectionRef?: Ref<View>;
  onTwapFieldFocus?: () => void;
  onTwapFieldBlur?: () => void;
  /** Fires on every TWAP duration-field tap, including while focused. */
  onTwapFieldPress?: () => void;
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
