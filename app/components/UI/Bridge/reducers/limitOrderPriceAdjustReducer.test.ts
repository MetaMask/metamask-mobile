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
  hasUserEditedLimitPrice: true,
  isCustomActive: true,
  customValue: '8',
};

describe('limitOrderPriceAdjustReducer', () => {
  it('matches the expected initial state', () => {
    expect(initialLimitOrderPriceAdjustState).toEqual({
      executionType: LimitOrderExecutionType.BUY,
      limitPrice: undefined,
      isLimitFiatMode: true,
      hasUserEditedLimitPrice: false,
      isCustomActive: false,
      customValue: undefined,
    });
  });

  describe('setLimitPrice', () => {
    it('stores the limit price and marks the limit price as user edited', () => {
      const result = limitOrderPriceAdjustReducer(
        initialLimitOrderPriceAdjustState,
        { type: 'setLimitPrice', limitPrice: '95' },
      );

      expect(result).toEqual({
        ...initialLimitOrderPriceAdjustState,
        limitPrice: '95',
        hasUserEditedLimitPrice: true,
      });
    });
  });

  describe('applyPreset', () => {
    it('clears custom mode and stores the preset limit price when provided', () => {
      const result = limitOrderPriceAdjustReducer(modifiedState, {
        type: 'applyPreset',
        limitPrice: '110',
      });

      expect(result).toEqual({
        ...modifiedState,
        limitPrice: '110',
        hasUserEditedLimitPrice: true,
        isCustomActive: false,
        customValue: undefined,
      });
    });

    it('clears custom mode without changing limit price when preset value is omitted', () => {
      const result = limitOrderPriceAdjustReducer(modifiedState, {
        type: 'applyPreset',
      });

      expect(result).toEqual({
        ...modifiedState,
        isCustomActive: false,
        customValue: undefined,
      });
    });
  });

  describe('seedFromMarket', () => {
    it('seeds market price without marking user edits or changing denomination', () => {
      const result = limitOrderPriceAdjustReducer(modifiedState, {
        type: 'seedFromMarket',
        limitPrice: '100',
      });

      expect(result).toEqual({
        ...modifiedState,
        limitPrice: '100',
      });
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
    it('toggles fiat mode, stores the converted limit price, and marks the limit price as user edited', () => {
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
        hasUserEditedLimitPrice: true,
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
        hasUserEditedLimitPrice: false,
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
        hasUserEditedLimitPrice: false,
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
        hasUserEditedLimitPrice: false,
        isCustomActive: false,
        customValue: undefined,
      });
    });
  });
});
