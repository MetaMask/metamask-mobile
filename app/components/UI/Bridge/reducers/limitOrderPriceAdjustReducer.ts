import { LimitOrderExecutionType } from '../constants/limitOrders';

export interface LimitOrderPriceAdjustState {
  limitPrice: string | undefined;
  isLimitFiatMode: boolean;
  isTrackingMarket: boolean;
  executionType: LimitOrderExecutionType;
  isCustomActive: boolean;
  customValue: string | undefined;
  hasUserEditedLimitPrice: boolean;
}

export type LimitOrderPriceAdjustAction =
  | { type: 'setLimitPrice'; limitPrice: string | undefined }
  | { type: 'applyPreset'; limitPrice?: string; isTrackingMarket: boolean }
  | {
      type: 'commitCustomPercent';
      limitPrice: string;
      isTrackingMarket: boolean;
      customValue: string;
    }
  | {
      type: 'seedFromMarket';
      limitPrice: string;
      executionType: LimitOrderExecutionType;
      isLimitFiatMode: boolean;
    }
  | { type: 'enterCustom' }
  | { type: 'exitCustom' }
  | { type: 'setCustomValue'; value: string | undefined }
  | {
      type: 'toggleFiatMode';
      convertLimitPrice: (limitPrice: string | undefined) => string | undefined;
    }
  | { type: 'flipSide'; isLimitFiatMode: boolean }
  | {
      type: 'reset';
      executionType: LimitOrderExecutionType;
      isLimitFiatMode: boolean;
    };

const PRICE_FIELDS_RESET = {
  limitPrice: undefined,
  isTrackingMarket: true,
  isCustomActive: false,
  customValue: undefined,
  hasUserEditedLimitPrice: false,
} as const satisfies Omit<
  LimitOrderPriceAdjustState,
  'executionType' | 'isLimitFiatMode'
>;

export const getInitialLimitOrderPriceAdjustState = ({
  executionType,
  isLimitFiatMode,
}: {
  executionType: LimitOrderExecutionType;
  isLimitFiatMode: boolean;
}): LimitOrderPriceAdjustState => ({
  executionType,
  isLimitFiatMode,
  ...PRICE_FIELDS_RESET,
});

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
        hasUserEditedLimitPrice: true,
      };
    case 'applyPreset':
      return {
        ...state,
        isCustomActive: false,
        customValue: undefined,
        isTrackingMarket: action.isTrackingMarket,
        ...(action.limitPrice !== undefined
          ? { limitPrice: action.limitPrice, hasUserEditedLimitPrice: true }
          : {}),
      };
    case 'commitCustomPercent':
      return {
        ...state,
        isTrackingMarket: action.isTrackingMarket,
        limitPrice: action.limitPrice,
        customValue: action.customValue,
        hasUserEditedLimitPrice: true,
      };
    case 'seedFromMarket':
      // A seed priced for another side or denomination is stale: a pair reset
      // queued in the same commit has already moved the state on, and a seed
      // for the new side follows once it renders. A market refresh that rounds
      // to the same string is not a state change either.
      return state.executionType !== action.executionType ||
        state.isLimitFiatMode !== action.isLimitFiatMode ||
        state.limitPrice === action.limitPrice
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
        isLimitFiatMode: action.isLimitFiatMode,
        executionType:
          state.executionType === LimitOrderExecutionType.BUY
            ? LimitOrderExecutionType.SELL
            : LimitOrderExecutionType.BUY,
      };
    case 'reset':
      return {
        ...state,
        ...PRICE_FIELDS_RESET,
        executionType: action.executionType,
        isLimitFiatMode: action.isLimitFiatMode,
      };
    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
};
