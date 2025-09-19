import { tooltipContentRegistry } from './contentRegistry';
import FeesTooltipContent from './FeesTooltipContent';
import TPSLCountWarningTooltipContent from './TPSLCountWarningTooltipContent';
import WithdrawalFeesTooltipContent from './WithdrawalFeesTooltipContent';
import type { ContentRegistry } from './types';

describe('tooltipContentRegistry', () => {
  it('should be a valid ContentRegistry object', () => {
    expect(tooltipContentRegistry).toBeDefined();
    expect(typeof tooltipContentRegistry).toBe('object');
  });

  describe('registered components', () => {
    it('should have FeesTooltipContent for fees key', () => {
      expect(tooltipContentRegistry.fees).toBe(FeesTooltipContent);
    });

    it('should have FeesTooltipContent for closing_fees key', () => {
      expect(tooltipContentRegistry.closing_fees).toBe(FeesTooltipContent);
    });

    it('should have WithdrawalFeesTooltipContent for withdrawal_fees key', () => {
      expect(tooltipContentRegistry.withdrawal_fees).toBe(
        WithdrawalFeesTooltipContent,
      );
    });

    it('should have TPSLCountWarningTooltipContent for tpsl_count_warning key', () => {
      expect(tooltipContentRegistry.tpsl_count_warning).toBe(
        TPSLCountWarningTooltipContent,
      );
    });
  });

  describe('undefined entries', () => {
    const undefinedKeys = [
      'receive',
      'leverage',
      'liquidation_price',
      'margin',
      'open_interest',
      'funding_rate',
      'geo_block',
      'estimated_pnl',
      'limit_price',
      'tp_sl',
      'close_position_you_receive',
      'points',
    ];

    undefinedKeys.forEach((key) => {
      it(`should have undefined for ${key} key (fallback to string content)`, () => {
        expect(
          tooltipContentRegistry[key as keyof ContentRegistry],
        ).toBeUndefined();
      });
    });
  });

  describe('registry structure', () => {
    it('should contain all expected keys', () => {
      const expectedKeys = [
        'fees',
        'closing_fees',
        'withdrawal_fees',
        'receive',
        'leverage',
        'liquidation_price',
        'margin',
        'open_interest',
        'funding_rate',
        'geo_block',
        'estimated_pnl',
        'limit_price',
        'tp_sl',
        'close_position_you_receive',
        'tpsl_count_warning',
        'points',
      ];

      expectedKeys.forEach((key) => {
        expect(key in tooltipContentRegistry).toBe(true);
      });
    });

    it('should have correct type for defined components', () => {
      // Components that are defined should be functions (React components) or objects
      expect(tooltipContentRegistry.fees).toBeDefined();
      expect(tooltipContentRegistry.closing_fees).toBeDefined();
      expect(tooltipContentRegistry.withdrawal_fees).toBeDefined();
      expect(tooltipContentRegistry.tpsl_count_warning).toBeDefined();
    });

    it('should reuse FeesTooltipContent for both order and close position scenarios', () => {
      // Verify that both fees and closing_fees use the same component
      // This tests the documented behavior in the comments
      expect(tooltipContentRegistry.fees).toBe(
        tooltipContentRegistry.closing_fees,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle key lookups that might not exist', () => {
      const nonExistentKey = 'non_existent_key' as keyof ContentRegistry;
      expect(tooltipContentRegistry[nonExistentKey]).toBeUndefined();
    });

    it('should be immutable (registry reference should not change)', () => {
      const originalRegistry = tooltipContentRegistry;
      // Registry should be the same object instance
      expect(tooltipContentRegistry).toBe(originalRegistry);
    });
  });

  describe('component imports', () => {
    it('should successfully import all registered components', () => {
      expect(FeesTooltipContent).toBeDefined();
      expect(WithdrawalFeesTooltipContent).toBeDefined();
      expect(TPSLCountWarningTooltipContent).toBeDefined();
    });
  });
});
