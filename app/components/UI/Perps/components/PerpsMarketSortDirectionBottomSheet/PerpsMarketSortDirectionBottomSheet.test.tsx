import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsMarketSortDirectionBottomSheet from './PerpsMarketSortDirectionBottomSheet';
import type { SortDirection } from '../../utils/sortMarkets';

// Mock dependencies
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      optionsGrid: {},
      option: {},
      optionActive: {},
    },
  }),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const MockReact = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: MockReact.forwardRef(
        (
          {
            children,
            testID,
          }: {
            children: React.ReactNode;
            testID?: string;
          },
          ref: React.Ref<{
            onOpenBottomSheet: () => void;
            onCloseBottomSheet: () => void;
          }>,
        ) => {
          // Expose mock ref methods
          MockReact.useImperativeHandle(ref, () => ({
            onOpenBottomSheet: jest.fn(),
            onCloseBottomSheet: jest.fn(),
          }));

          return <View testID={testID}>{children}</View>;
        },
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View } = jest.requireActual('react-native');
    return function MockBottomSheetHeader({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return <View testID="bottom-sheet-header">{children}</View>;
    };
  },
);

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.sort.sort_direction': 'Sort Direction',
      'perps.sort.high_to_low': 'High to Low',
      'perps.sort.low_to_high': 'Low to High',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsMarketSortDirectionBottomSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnDirectionSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Visibility', () => {
    it('returns null when isVisible is false', () => {
      const { toJSON } = render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible={false}
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(toJSON()).toBeNull();
    });

    it('renders when isVisible is true', () => {
      render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(screen.getByTestId('bottom-sheet-header')).toBeOnTheScreen();
    });

    it('transitions from hidden to visible', () => {
      const { toJSON, rerender } = render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible={false}
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(toJSON()).toBeNull();

      rerender(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(toJSON()).not.toBeNull();
    });

    it('transitions from visible to hidden', () => {
      const { toJSON, rerender } = render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(toJSON()).not.toBeNull();

      rerender(
        <PerpsMarketSortDirectionBottomSheet
          isVisible={false}
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(toJSON()).toBeNull();
    });
  });

  describe('Component Rendering', () => {
    it('renders with testID when provided', () => {
      render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="custom-direction-sheet"
        />,
      );

      expect(screen.getByTestId('custom-direction-sheet')).toBeOnTheScreen();
    });

    it('renders both direction options', () => {
      render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="direction-sheet"
        />,
      );

      expect(
        screen.getByTestId('direction-sheet-option-desc'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('direction-sheet-option-asc'),
      ).toBeOnTheScreen();
    });

    it('renders header', () => {
      render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(screen.getByTestId('bottom-sheet-header')).toBeOnTheScreen();
    });
  });

  describe('Direction Selection', () => {
    it('calls onDirectionSelect with desc when desc option is pressed', () => {
      render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="asc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="direction-sheet"
        />,
      );

      const descOption = screen.getByTestId('direction-sheet-option-desc');
      fireEvent.press(descOption);

      expect(mockOnDirectionSelect).toHaveBeenCalledTimes(1);
      expect(mockOnDirectionSelect).toHaveBeenCalledWith('desc');
    });

    it('calls onDirectionSelect with asc when asc option is pressed', () => {
      render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="direction-sheet"
        />,
      );

      const ascOption = screen.getByTestId('direction-sheet-option-asc');
      fireEvent.press(ascOption);

      expect(mockOnDirectionSelect).toHaveBeenCalledTimes(1);
      expect(mockOnDirectionSelect).toHaveBeenCalledWith('asc');
    });

    it('calls onClose after direction is selected', () => {
      render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="direction-sheet"
        />,
      );

      const ascOption = screen.getByTestId('direction-sheet-option-asc');
      fireEvent.press(ascOption);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls both onDirectionSelect and onClose in correct order', () => {
      const callOrder: string[] = [];
      const trackingOnDirectionSelect = jest.fn((direction: SortDirection) => {
        callOrder.push(`select-${direction}`);
      });
      const trackingOnClose = jest.fn(() => {
        callOrder.push('close');
      });

      render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={trackingOnClose}
          selectedDirection="desc"
          onDirectionSelect={trackingOnDirectionSelect}
          testID="direction-sheet"
        />,
      );

      const ascOption = screen.getByTestId('direction-sheet-option-asc');
      fireEvent.press(ascOption);

      expect(callOrder).toEqual(['select-asc', 'close']);
    });
  });

  describe('Selected Direction State', () => {
    it('renders with desc selected', () => {
      render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="direction-sheet"
        />,
      );

      expect(
        screen.getByTestId('direction-sheet-option-desc'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('direction-sheet-option-asc'),
      ).toBeOnTheScreen();
    });

    it('renders with asc selected', () => {
      render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="asc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="direction-sheet"
        />,
      );

      expect(
        screen.getByTestId('direction-sheet-option-desc'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('direction-sheet-option-asc'),
      ).toBeOnTheScreen();
    });

    it('updates when selectedDirection changes', () => {
      const { rerender } = render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="direction-sheet"
        />,
      );

      rerender(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="asc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="direction-sheet"
        />,
      );

      expect(
        screen.getByTestId('direction-sheet-option-desc'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('direction-sheet-option-asc'),
      ).toBeOnTheScreen();
    });
  });

  describe('User Interactions', () => {
    it('handles multiple rapid selections', () => {
      render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="direction-sheet"
        />,
      );

      const ascOption = screen.getByTestId('direction-sheet-option-asc');
      fireEvent.press(ascOption);
      fireEvent.press(ascOption);

      // Should be called twice (no debouncing)
      expect(mockOnDirectionSelect).toHaveBeenCalledTimes(2);
      expect(mockOnClose).toHaveBeenCalledTimes(2);
    });

    it('handles selecting the same direction multiple times', () => {
      render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="direction-sheet"
        />,
      );

      const descOption = screen.getByTestId('direction-sheet-option-desc');
      fireEvent.press(descOption);
      fireEvent.press(descOption);

      expect(mockOnDirectionSelect).toHaveBeenCalledTimes(2);
      expect(mockOnDirectionSelect).toHaveBeenNthCalledWith(1, 'desc');
      expect(mockOnDirectionSelect).toHaveBeenNthCalledWith(2, 'desc');
    });

    it('handles selecting different directions in sequence', () => {
      render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="direction-sheet"
        />,
      );

      const descOption = screen.getByTestId('direction-sheet-option-desc');
      const ascOption = screen.getByTestId('direction-sheet-option-asc');

      fireEvent.press(descOption);
      fireEvent.press(ascOption);

      expect(mockOnDirectionSelect).toHaveBeenCalledTimes(2);
      expect(mockOnDirectionSelect).toHaveBeenNthCalledWith(1, 'desc');
      expect(mockOnDirectionSelect).toHaveBeenNthCalledWith(2, 'asc');
    });
  });

  describe('Props Updates', () => {
    it('updates callbacks correctly', () => {
      const { rerender } = render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="direction-sheet"
        />,
      );

      const newOnClose = jest.fn();
      const newOnDirectionSelect = jest.fn();

      rerender(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={newOnClose}
          selectedDirection="desc"
          onDirectionSelect={newOnDirectionSelect}
          testID="direction-sheet"
        />,
      );

      const ascOption = screen.getByTestId('direction-sheet-option-asc');
      fireEvent.press(ascOption);

      expect(newOnDirectionSelect).toHaveBeenCalledTimes(1);
      expect(newOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnDirectionSelect).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('updates testID correctly', () => {
      const { rerender } = render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="sheet-1"
        />,
      );

      expect(screen.getByTestId('sheet-1')).toBeOnTheScreen();

      rerender(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
          testID="sheet-2"
        />,
      );

      expect(screen.queryByTestId('sheet-1')).not.toBeOnTheScreen();
      expect(screen.getByTestId('sheet-2')).toBeOnTheScreen();
    });
  });

  describe('Component Lifecycle', () => {
    it('does not throw error on unmount when visible', () => {
      const { unmount } = render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(() => unmount()).not.toThrow();
    });

    it('does not throw error on unmount when hidden', () => {
      const { unmount } = render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible={false}
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(() => unmount()).not.toThrow();
    });

    it('cleans up properly when remounted with different props', () => {
      const { toJSON, rerender, unmount } = render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(toJSON()).not.toBeNull();

      rerender(
        <PerpsMarketSortDirectionBottomSheet
          isVisible={false}
          onClose={mockOnClose}
          selectedDirection="asc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(toJSON()).toBeNull();

      rerender(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="asc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(toJSON()).not.toBeNull();

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined testID gracefully', () => {
      const { root } = render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(root).toBeTruthy();
    });

    it('renders without errors when all props are provided', () => {
      expect(() =>
        render(
          <PerpsMarketSortDirectionBottomSheet
            isVisible
            onClose={mockOnClose}
            selectedDirection="desc"
            onDirectionSelect={mockOnDirectionSelect}
            testID="direction-sheet"
          />,
        ),
      ).not.toThrow();
    });

    it('handles rapid visibility toggles', () => {
      const { toJSON, rerender } = render(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(toJSON()).not.toBeNull();

      rerender(
        <PerpsMarketSortDirectionBottomSheet
          isVisible={false}
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(toJSON()).toBeNull();

      rerender(
        <PerpsMarketSortDirectionBottomSheet
          isVisible
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(toJSON()).not.toBeNull();

      rerender(
        <PerpsMarketSortDirectionBottomSheet
          isVisible={false}
          onClose={mockOnClose}
          selectedDirection="desc"
          onDirectionSelect={mockOnDirectionSelect}
        />,
      );

      expect(toJSON()).toBeNull();
    });
  });
});
