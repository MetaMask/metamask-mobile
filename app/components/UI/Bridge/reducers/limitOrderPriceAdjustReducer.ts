import { LimitOrderExecutionType } from '../constants/limitOrders';

export interface LimitOrderPriceAdjustState {
  limitPrice: string | undefined;
  isLimitFiatMode: boolean;
  isTrackingMarket: boolean;
  executionType: LimitOrderExecutionType;
  isCustomActive: boolean;
  customValue: string | undefined;
}

export type LimitOrderPriceAdjustAction =
  | { type: 'setLimitPrice'; limitPrice: string | undefined }
  | { type: 'applyPreset'; limitPrice?: string; isTrackingMarket: boolean }
  | {
      type: 'commitCustomPercent';
      limitPrice: string;
      isTrackingMarket: boolean;
    }
  | { type: 'seedFromMarket'; limitPrice: string }
  | { type: 'enterCustom' }
  | { type: 'exitCustom' }
  | { type: 'setCustomValue'; value: string | undefined }
  | {
      type: 'toggleFiatMode';
      convertLimitPrice: (limitPrice: string | undefined) => string | undefined;
    }
  | { type: 'flipSide' }
  | { type: 'reset' };

const PRICE_FIELDS_RESET = {
  limitPrice: undefined,
  isLimitFiatMode: true,
  isTrackingMarket: true,
  isCustomActive: false,
  customValue: undefined,
} as const satisfies Omit<LimitOrderPriceAdjustState, 'executionType'>;

export const initialLimitOrderPriceAdjustState: LimitOrderPriceAdjustState = {
  executionType: LimitOrderExecutionType.BUY,
  ...PRICE_FIELDS_RESET,
};

export const limitOrderPriceAdjustReducer = (
  state: LimitOrderPriceAdjustState,
  action: LimitOrderPriceAdjustAction,
): LimitOrderPriceAdjustState => {
  switch (action.type) {
    case 'setLimitPrice':
      return {
        ...state,
        isTrackingMarket: false,
        limitPrice: action.limitPrice,
      };
    case 'applyPreset':
      return {
        ...state,
        isCustomActive: false,
        customValue: undefined,
        isTrackingMarket: action.isTrackingMarket,
        ...(action.limitPrice !== undefined
          ? { limitPrice: action.limitPrice }
          : {}),
      };
    case 'commitCustomPercent':
      return {
        ...state,
        isTrackingMarket: action.isTrackingMarket,
        limitPrice: action.limitPrice,
      };
    case 'seedFromMarket':
      // A market refresh that rounds to the same string is not a state change.
      return state.limitPrice === action.limitPrice
        ? state
        : {
            ...state,
            limitPrice: action.limitPrice,
          };
    case 'enterCustom':
      return {
        ...state,
        isCustomActive: true,
      };
    case 'exitCustom':
      return {
        ...state,
        isCustomActive: false,
        customValue: undefined,
      };
    case 'setCustomValue':
      return {
        ...state,
        customValue: action.value,
      };
    case 'toggleFiatMode':
      return {
        ...state,
        isTrackingMarket: false,
        isLimitFiatMode: !state.isLimitFiatMode,
        limitPrice: action.convertLimitPrice(state.limitPrice),
      };
    case 'flipSide':
      return {
        ...PRICE_FIELDS_RESET,
        executionType:
          state.executionType === LimitOrderExecutionType.BUY
            ? LimitOrderExecutionType.SELL
            : LimitOrderExecutionType.BUY,
      };
    case 'reset':
      return {
        ...state,
        ...PRICE_FIELDS_RESET,
      };
    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
};
