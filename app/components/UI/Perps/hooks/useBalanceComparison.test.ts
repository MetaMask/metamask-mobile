import { renderHook, act } from '@testing-library/react-native';
import { useBalanceComparison } from './useBalanceComparison';
import type { PulseColor } from './useColorPulseAnimation';

describe('useBalanceComparison', () => {
  describe('Initial State', () => {
    it('should initialize with empty string as default previous balance', () => {
      const { result } = renderHook(() => useBalanceComparison());

      expect(result.current.previousBalance).toBe('');
    });

    it('should initialize with provided initial balance', () => {
      const initialBalance = '100.50';
      const { result } = renderHook(() => useBalanceComparison(initialBalance));

      expect(result.current.previousBalance).toBe(initialBalance);
    });
  });

  describe('compareAndUpdateBalance', () => {
    describe('Initial Comparison (No Previous Balance)', () => {
      it('should return "same" for first comparison when no initial balance provided', () => {
        const { result } = renderHook(() => useBalanceComparison());

        let comparisonResult: PulseColor = 'same';
        act(() => {
          comparisonResult = result.current.compareAndUpdateBalance('100.00');
        });

        expect(comparisonResult).toBe('same');
        expect(result.current.previousBalance).toBe('100.00');
      });

      it('should return "same" for first comparison even with different value when initial balance provided', () => {
        const { result } = renderHook(() => useBalanceComparison('50.00'));

        let comparisonResult: PulseColor = 'same';
        act(() => {
          comparisonResult = result.current.compareAndUpdateBalance('100.00');
        });

        expect(comparisonResult).toBe('increase');
        expect(result.current.previousBalance).toBe('100.00');
      });
    });

    describe('Balance Increase Detection', () => {
      it('should return "increase" when new balance is higher than previous', () => {
        const { result } = renderHook(() => useBalanceComparison('100.00'));

        // First comparison to set previous balance
        act(() => {
          result.current.compareAndUpdateBalance('100.00');
        });

        let comparisonResult: PulseColor = 'same';
        act(() => {
          comparisonResult = result.current.compareAndUpdateBalance('150.00');
        });

        expect(comparisonResult).toBe('increase');
        expect(result.current.previousBalance).toBe('150.00');
      });

      it('should return "increase" for small incremental changes', () => {
        const { result } = renderHook(() => useBalanceComparison('100.00'));

        // Set initial balance
        act(() => {
          result.current.compareAndUpdateBalance('100.00');
        });

        let comparisonResult: PulseColor = 'same';
        act(() => {
          comparisonResult = result.current.compareAndUpdateBalance('100.01');
        });

        expect(comparisonResult).toBe('increase');
      });
    });

    describe('Balance Decrease Detection', () => {
      it('should return "decrease" when new balance is lower than previous', () => {
        const { result } = renderHook(() => useBalanceComparison('150.00'));

        // First comparison to set previous balance
        act(() => {
          result.current.compareAndUpdateBalance('150.00');
        });

        let comparisonResult: PulseColor = 'same';
        act(() => {
          comparisonResult = result.current.compareAndUpdateBalance('75.00');
        });

        expect(comparisonResult).toBe('decrease');
        expect(result.current.previousBalance).toBe('75.00');
      });

      it('should return "decrease" for small decremental changes', () => {
        const { result } = renderHook(() => useBalanceComparison('100.00'));

        // Set initial balance
        act(() => {
          result.current.compareAndUpdateBalance('100.00');
        });

        let comparisonResult: PulseColor = 'same';
        act(() => {
          comparisonResult = result.current.compareAndUpdateBalance('99.99');
        });

        expect(comparisonResult).toBe('decrease');
      });
    });

    describe('No Change Detection', () => {
      it('should return "same" when new balance equals previous balance', () => {
        const { result } = renderHook(() => useBalanceComparison('100.00'));

        // First comparison to set previous balance
        act(() => {
          result.current.compareAndUpdateBalance('100.00');
        });

        let comparisonResult: PulseColor = 'same';
        act(() => {
          comparisonResult = result.current.compareAndUpdateBalance('100.00');
        });

        expect(comparisonResult).toBe('same');
        expect(result.current.previousBalance).toBe('100.00');
      });

      it('should return "same" when both balances are zero', () => {
        const { result } = renderHook(() => useBalanceComparison('0'));

        // First comparison
        act(() => {
          result.current.compareAndUpdateBalance('0');
        });

        let comparisonResult: PulseColor = 'same';
        act(() => {
          comparisonResult = result.current.compareAndUpdateBalance('0.00');
        });

        expect(comparisonResult).toBe('same');
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should handle empty string inputs gracefully', () => {
        const { result } = renderHook(() => useBalanceComparison('100.00'));

        // Set initial balance
        act(() => {
          result.current.compareAndUpdateBalance('100.00');
        });

        let comparisonResult: PulseColor = 'same';
        act(() => {
          comparisonResult = result.current.compareAndUpdateBalance('');
        });

        expect(comparisonResult).toBe('decrease');
        expect(result.current.previousBalance).toBe('');
      });

      it('should handle invalid number strings as NaN', () => {
        const { result } = renderHook(() => useBalanceComparison('100.00'));

        // Set initial balance
        act(() => {
          result.current.compareAndUpdateBalance('100.00');
        });

        let comparisonResult: PulseColor = 'same';
        act(() => {
          comparisonResult = result.current.compareAndUpdateBalance('invalid');
        });

        expect(comparisonResult).toBe('same');
        expect(result.current.previousBalance).toBe('invalid');
      });

      it('should handle undefined input by treating as zero', () => {
        const { result } = renderHook(() => useBalanceComparison('50.00'));

        // Set initial balance
        act(() => {
          result.current.compareAndUpdateBalance('50.00');
        });

        let comparisonResult: PulseColor = 'same';
        act(() => {
          comparisonResult = result.current.compareAndUpdateBalance(
            undefined as unknown as string,
          );
        });

        expect(comparisonResult).toBe('decrease');
        expect(result.current.previousBalance).toBe(undefined);
      });

      it('should handle very large numbers correctly', () => {
        const { result } = renderHook(() =>
          useBalanceComparison('999999999.99'),
        );

        // Set initial balance
        act(() => {
          result.current.compareAndUpdateBalance('999999999.99');
        });

        let comparisonResult: PulseColor = 'same';
        act(() => {
          comparisonResult =
            result.current.compareAndUpdateBalance('1000000000.00');
        });

        expect(comparisonResult).toBe('increase');
      });

      it('should handle negative numbers correctly', () => {
        const { result } = renderHook(() => useBalanceComparison('-50.00'));

        // Set initial balance
        act(() => {
          result.current.compareAndUpdateBalance('-50.00');
        });

        let comparisonResult: PulseColor = 'same';
        act(() => {
          comparisonResult = result.current.compareAndUpdateBalance('-25.00');
        });

        expect(comparisonResult).toBe('increase'); // -25 > -50
      });
    });

    describe('State Updates', () => {
      it('should update previous balance after each comparison', () => {
        const { result } = renderHook(() => useBalanceComparison());

        // First update
        act(() => {
          result.current.compareAndUpdateBalance('100.00');
        });
        expect(result.current.previousBalance).toBe('100.00');

        // Second update
        act(() => {
          result.current.compareAndUpdateBalance('200.00');
        });
        expect(result.current.previousBalance).toBe('200.00');

        // Third update
        act(() => {
          result.current.compareAndUpdateBalance('50.00');
        });
        expect(result.current.previousBalance).toBe('50.00');
      });
    });
  });

  describe('resetBalance', () => {
    it('should reset previous balance to empty string', () => {
      const { result } = renderHook(() => useBalanceComparison('100.00'));

      // Verify initial state
      expect(result.current.previousBalance).toBe('100.00');

      // Reset balance
      act(() => {
        result.current.resetBalance();
      });

      expect(result.current.previousBalance).toBe('');
    });

    it('should reset balance after multiple updates', () => {
      const { result } = renderHook(() => useBalanceComparison());

      // Multiple updates
      act(() => {
        result.current.compareAndUpdateBalance('100.00');
      });
      act(() => {
        result.current.compareAndUpdateBalance('200.00');
      });

      expect(result.current.previousBalance).toBe('200.00');

      // Reset
      act(() => {
        result.current.resetBalance();
      });

      expect(result.current.previousBalance).toBe('');
    });

    it('should return "same" for next comparison after reset', () => {
      const { result } = renderHook(() => useBalanceComparison('100.00'));

      // Set up some balance
      act(() => {
        result.current.compareAndUpdateBalance('100.00');
      });

      // Reset
      act(() => {
        result.current.resetBalance();
      });

      // Next comparison should be treated as initial
      let comparisonResult: PulseColor = 'same';
      act(() => {
        comparisonResult = result.current.compareAndUpdateBalance('50.00');
      });

      expect(comparisonResult).toBe('same');
    });
  });

  describe('Hook Stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useBalanceComparison());

      const initialCompareFunction = result.current.compareAndUpdateBalance;
      const initialResetFunction = result.current.resetBalance;

      // Trigger re-render
      rerender({});

      expect(result.current.compareAndUpdateBalance).toBe(
        initialCompareFunction,
      );
      expect(result.current.resetBalance).toBe(initialResetFunction);
    });

    it('should update function reference when previousBalance changes', () => {
      const { result } = renderHook(() => useBalanceComparison());

      const initialCompareFunction = result.current.compareAndUpdateBalance;

      // Update balance to change dependency
      act(() => {
        result.current.compareAndUpdateBalance('100.00');
      });

      // Function should be recreated due to previousBalance dependency
      expect(result.current.compareAndUpdateBalance).not.toBe(
        initialCompareFunction,
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle rapid balance updates correctly', () => {
      const { result } = renderHook(() => useBalanceComparison('100.00'));

      const updates = ['100.00', '105.00', '103.00', '110.00', '95.00'];
      const expectedResults: PulseColor[] = [
        'same',
        'increase',
        'decrease',
        'increase',
        'decrease',
      ];
      const actualResults: PulseColor[] = [];

      updates.forEach((balance) => {
        act(() => {
          const result_comparison =
            result.current.compareAndUpdateBalance(balance);
          actualResults.push(result_comparison);
        });
      });

      expect(actualResults).toEqual(expectedResults);
      expect(result.current.previousBalance).toBe('95.00');
    });

    it('should work correctly with decimal precision variations', () => {
      const { result } = renderHook(() => useBalanceComparison('100.000'));

      // Set initial
      act(() => {
        result.current.compareAndUpdateBalance('100.000');
      });

      let comparisonResult: PulseColor = 'same';
      act(() => {
        comparisonResult = result.current.compareAndUpdateBalance('100.001');
      });

      expect(comparisonResult).toBe('increase');
    });
  });
});
