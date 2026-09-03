import { LimitOrderExecutionType } from '../constants/limitOrders';
import {
  initialLimitOrderPriceAdjustState,
  limitOrderPriceAdjustReducer,
  type LimitOrderPriceAdjustState,
} from './limitOrderPriceAdjustReducer';

const modifiedState: LimitOrderPriceAdjustState = {
  executionType: LimitOrderExecutionType.SELL,
  limitPrice: '120',
  isLimitFiatMode: false,
  isTrackingMarket: false,
  isCustomActive: true,
  customValue: '8',
};

describe('limitOrderPriceAdjustReducer', () => {
  it('matches the expected initial state', () => {
    expect(initialLimitOrderPriceAdjustState).toEqual({
      executionType: LimitOrderExecutionType.BUY,
      limitPrice: undefined,
      isLimitFiatMode: true,
      isTrackingMarket: true,
      isCustomActive: false,
      customValue: undefined,
    });
  });

  describe('setLimitPrice', () => {
    it('stores the limit price and stops market tracking', () => {
      const result = limitOrderPriceAdjustReducer(
        initialLimitOrderPriceAdjustState,
        { type: 'setLimitPrice', limitPrice: '95' },
      );

      expect(result).toEqual({
        ...initialLimitOrderPriceAdjustState,
        limitPrice: '95',
        isTrackingMarket: false,
      });
    });
  });

  describe('applyPreset', () => {
    it('clears custom mode and stores the preset limit price when provided', () => {
      const result = limitOrderPriceAdjustReducer(modifiedState, {
        type: 'applyPreset',
        limitPrice: '110',
        isTrackingMarket: false,
      });

      expect(result).toEqual({
        ...modifiedState,
        limitPrice: '110',
        isTrackingMarket: false,
        isCustomActive: false,
        customValue: undefined,
      });
    });

    it('resumes market tracking for a market preset', () => {
      const result = limitOrderPriceAdjustReducer(modifiedState, {
        type: 'applyPreset',
        limitPrice: '100',
        isTrackingMarket: true,
      });

      expect(result).toEqual({
        ...modifiedState,
        limitPrice: '100',
        isTrackingMarket: true,
        isCustomActive: false,
        customValue: undefined,
      });
    });

    it('clears custom mode without changing limit price when preset value is omitted', () => {
      const result = limitOrderPriceAdjustReducer(modifiedState, {
        type: 'applyPreset',
        isTrackingMarket: false,
      });

      expect(result).toEqual({
        ...modifiedState,
        isCustomActive: false,
        customValue: undefined,
      });
    });
  });

  describe('commitCustomPercent', () => {
    it('stores the limit price and keeps custom mode active', () => {
      const result = limitOrderPriceAdjustReducer(modifiedState, {
        type: 'commitCustomPercent',
        limitPrice: '130',
        isTrackingMarket: false,
      });

      expect(result).toEqual({
        ...modifiedState,
        limitPrice: '130',
        isTrackingMarket: false,
        isCustomActive: true,
        customValue: '8',
      });
    });

    it('resumes market tracking when the committed percent is market', () => {
      const result = limitOrderPriceAdjustReducer(modifiedState, {
        type: 'commitCustomPercent',
        limitPrice: '100',
        isTrackingMarket: true,
      });

      expect(result).toEqual({
        ...modifiedState,
        limitPrice: '100',
        isTrackingMarket: true,
      });
    });
  });

  describe('seedFromMarket', () => {
    it('seeds market price without changing tracking or denomination', () => {
      const result = limitOrderPriceAdjustReducer(modifiedState, {
        type: 'seedFromMarket',
        limitPrice: '100',
      });

      expect(result).toEqual({
        ...modifiedState,
        limitPrice: '100',
      });
    });

    it('returns the same state when the seeded price is unchanged', () => {
      const result = limitOrderPriceAdjustReducer(modifiedState, {
        type: 'seedFromMarket',
        limitPrice: modifiedState.limitPrice as string,
      });

      expect(result).toBe(modifiedState);
    });
  });

  describe('enterCustom', () => {
    it('activates custom percent mode', () => {
      const result = limitOrderPriceAdjustReducer(
        initialLimitOrderPriceAdjustState,
        { type: 'enterCustom' },
      );

      expect(result).toEqual({
        ...initialLimitOrderPriceAdjustState,
        isCustomActive: true,
      });
    });
  });

  describe('exitCustom', () => {
    it('clears custom mode without changing the limit price', () => {
      const result = limitOrderPriceAdjustReducer(modifiedState, {
        type: 'exitCustom',
      });

      expect(result).toEqual({
        ...modifiedState,
        isCustomActive: false,
        customValue: undefined,
      });
    });
  });

  describe('setCustomValue', () => {
    it('stores the custom percent value', () => {
      const result = limitOrderPriceAdjustReducer(
        initialLimitOrderPriceAdjustState,
        { type: 'setCustomValue', value: '12' },
      );

      expect(result).toEqual({
        ...initialLimitOrderPriceAdjustState,
        customValue: '12',
      });
    });
  });

  describe('toggleFiatMode', () => {
    it('toggles fiat mode, stores the converted limit price, and stops market tracking', () => {
      const result = limitOrderPriceAdjustReducer(
        {
          ...initialLimitOrderPriceAdjustState,
          limitPrice: '1',
        },
        { type: 'toggleFiatMode', convertLimitPrice: () => '0.05' },
      );

      expect(result).toEqual({
        ...initialLimitOrderPriceAdjustState,
        isLimitFiatMode: false,
        limitPrice: '0.05',
        isTrackingMarket: false,
      });
    });

    it('converts the current limit price after a prior setLimitPrice', () => {
      const afterCommit = limitOrderPriceAdjustReducer(
        {
          ...initialLimitOrderPriceAdjustState,
          limitPrice: '1',
        },
        { type: 'setLimitPrice', limitPrice: '0.95' },
      );

      const result = limitOrderPriceAdjustReducer(afterCommit, {
        type: 'toggleFiatMode',
        convertLimitPrice: (limitPrice) =>
          limitPrice === '0.95' ? '0.000475' : 'stale',
      });

      expect(result.limitPrice).toBe('0.000475');
      expect(result.isLimitFiatMode).toBe(false);
    });
  });

  describe('flipSide', () => {
    it('flips buy to sell and resets price fields', () => {
      const result = limitOrderPriceAdjustReducer(modifiedState, {
        type: 'flipSide',
      });

      expect(result).toEqual({
        executionType: LimitOrderExecutionType.BUY,
        limitPrice: undefined,
        isLimitFiatMode: true,
        isTrackingMarket: true,
        isCustomActive: false,
        customValue: undefined,
      });
    });

    it('flips sell to buy and resets price fields', () => {
      const result = limitOrderPriceAdjustReducer(
        {
          ...modifiedState,
          executionType: LimitOrderExecutionType.BUY,
        },
        { type: 'flipSide' },
      );

      expect(result).toEqual({
        executionType: LimitOrderExecutionType.SELL,
        limitPrice: undefined,
        isLimitFiatMode: true,
        isTrackingMarket: true,
        isCustomActive: false,
        customValue: undefined,
      });
    });
  });

  describe('reset', () => {
    it('resets price fields while preserving execution type', () => {
      const result = limitOrderPriceAdjustReducer(modifiedState, {
        type: 'reset',
      });

      expect(result).toEqual({
        executionType: LimitOrderExecutionType.SELL,
        limitPrice: undefined,
        isLimitFiatMode: true,
        isTrackingMarket: true,
        isCustomActive: false,
        customValue: undefined,
      });
    });
  });
});
