import type { OrderType } from '@metamask/perps-controller';
export type PerpsProOrderDirection = 'long' | 'short';
export type PerpsProOrderNotice =
  | {
      id: string;
      variant: 'banner';
      title?: string;
      message: string;
    }
  | {
      id: string;
      variant: 'inline';
      message: string;
    };
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
  marginModeLabel: string;
  leverageLabel: string;
  onLeveragePress?: () => void;
  orderType: OrderType;
  onOrderTypeChange: (orderType: OrderType) => void;
  limitPrice: string;
  onLimitPriceChange: (value: string) => void;
  onUseMidPricePress?: () => void;
  size: string;
  onSizeChange: (value: string) => void;
  onSizeUnitPress?: () => void;
  balancePercentage: number;
  onBalancePercentageChange: (value: number) => void;
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
