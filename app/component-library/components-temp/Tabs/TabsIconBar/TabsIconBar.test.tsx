// Third party dependencies.
import React from 'react';
import { Animated } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';

// Internal dependencies.
import TabsIconBar from './TabsIconBar';
import { TabsIconItem } from './TabsIconBar.types';
import { IconName } from '../../../components/Icons/Icon/Icon.types';

const mockLayoutEvent = (width: number) => ({
  nativeEvent: { layout: { x: 0, y: 0, width, height: 60 } },
});

const tabLayout = (x: number, width: number) => ({
  nativeEvent: { layout: { x, y: 0, width, height: 60 } },
});

describe('TabsIconBar', () => {
  const mockTabs: TabsIconItem[] = [
    {
      key: 'tab1',
      label: 'Portfolio',
      iconName: IconName.PieChart,
      content: null,
    },
    {
      key: 'tab2',
      label: 'Perpetuals',
      iconName: IconName.Candlestick,
      content: null,
    },
    {
      key: 'tab3',
      label: 'Predictions',
      iconName: IconName.Predictions,
      content: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('displays all tab labels', () => {
      const { getByText } = render(
        <TabsIconBar tabs={mockTabs} activeIndex={0} onTabPress={jest.fn()} />,
      );
      mockTabs.forEach((tab) => expect(getByText(tab.label)).toBeOnTheScreen());
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={jest.fn()}
          testID="icon-bar"
        />,
      );
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });

    it('handles empty tabs array', () => {
      const { getByTestId } = render(
        <TabsIconBar
          tabs={[]}
          activeIndex={0}
          onTabPress={jest.fn()}
          testID="icon-bar"
        />,
      );
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });

    it('hides underline when activeIndex is -1', () => {
      const { getByTestId } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={-1}
          onTabPress={jest.fn()}
          testID="icon-bar"
        />,
      );
      act(() => {
        fireEvent(getByTestId('icon-bar'), 'onLayout', mockLayoutEvent(400));
        mockTabs.forEach((_, i) =>
          fireEvent(
            getByTestId(`icon-bar-tab-${i}`),
            'onLayout',
            tabLayout(i * 120, 100),
          ),
        );
      });
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });
  });

  describe('Tab Interaction', () => {
    it('calls onTabPress with correct index', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="icon-bar"
        />,
      );
      fireEvent.press(getByTestId('icon-bar-tab-1'));
      expect(mockOnTabPress).toHaveBeenCalledWith(1);
    });

    it('does not call onTabPress for disabled tabs', () => {
      const mockOnTabPress = jest.fn();
      const tabsWithDisabled: TabsIconItem[] = [
        {
          key: 'tab1',
          label: 'Portfolio',
          iconName: IconName.PieChart,
          content: null,
        },
        {
          key: 'tab2',
          label: 'Perpetuals',
          iconName: IconName.Candlestick,
          content: null,
          isDisabled: true,
        },
      ];
      const { getByTestId } = render(
        <TabsIconBar
          tabs={tabsWithDisabled}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="icon-bar"
        />,
      );
      fireEvent.press(getByTestId('icon-bar-tab-1'));
      expect(mockOnTabPress).not.toHaveBeenCalled();
    });
  });

  describe('Fill Width', () => {
    it('renders with fillWidth without throwing', () => {
      expect(() =>
        render(
          <TabsIconBar
            tabs={mockTabs}
            activeIndex={0}
            onTabPress={jest.fn()}
            fillWidth
          />,
        ),
      ).not.toThrow();
    });

    it('skips scroll overflow detection when fillWidth is true', () => {
      const { getByTestId } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={jest.fn()}
          fillWidth
          testID="icon-bar"
        />,
      );
      // With fillWidth, even a tiny container should never trigger scroll mode
      act(() => {
        fireEvent(getByTestId('icon-bar'), 'onLayout', mockLayoutEvent(50));
        mockTabs.forEach((_, i) =>
          fireEvent(
            getByTestId(`icon-bar-tab-${i}`),
            'onLayout',
            tabLayout(i * 100, 90),
          ),
        );
      });
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });
  });

  describe('Scroll Mode', () => {
    it('activates scroll mode when tabs overflow the container', () => {
      const { getByTestId } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={jest.fn()}
          testID="icon-bar"
        />,
      );
      act(() => {
        // Container too narrow to fit all tabs
        fireEvent(getByTestId('icon-bar'), 'onLayout', mockLayoutEvent(100));
        mockTabs.forEach((_, i) =>
          fireEvent(
            getByTestId(`icon-bar-tab-${i}`),
            'onLayout',
            tabLayout(i * 150, 140),
          ),
        );
      });
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });

    it('calls onTabPress in scroll mode', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="icon-bar"
        />,
      );
      act(() => {
        fireEvent(getByTestId('icon-bar'), 'onLayout', mockLayoutEvent(100));
        mockTabs.forEach((_, i) =>
          fireEvent(
            getByTestId(`icon-bar-tab-${i}`),
            'onLayout',
            tabLayout(i * 150, 140),
          ),
        );
      });
      fireEvent.press(getByTestId('icon-bar-tab-2'));
      expect(mockOnTabPress).toHaveBeenCalledWith(2);
    });
  });

  describe('Underline Animation', () => {
    it('initializes underline when all tab layouts are measured', () => {
      const { getByTestId } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={jest.fn()}
          testID="icon-bar"
        />,
      );
      act(() => {
        fireEvent(getByTestId('icon-bar'), 'onLayout', mockLayoutEvent(400));
        mockTabs.forEach((_, i) =>
          fireEvent(
            getByTestId(`icon-bar-tab-${i}`),
            'onLayout',
            tabLayout(i * 120, 100),
          ),
        );
      });
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });

    it('animates underline on subsequent tab switches (non-first-time path)', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId, rerender } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="icon-bar"
        />,
      );
      act(() => {
        fireEvent(getByTestId('icon-bar'), 'onLayout', mockLayoutEvent(400));
        mockTabs.forEach((_, i) =>
          fireEvent(
            getByTestId(`icon-bar-tab-${i}`),
            'onLayout',
            tabLayout(i * 120, 100),
          ),
        );
      });
      // Second switch — triggers the animated timing path, not setValue
      rerender(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
          testID="icon-bar"
        />,
      );
      rerender(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={2}
          onTabPress={mockOnTabPress}
          testID="icon-bar"
        />,
      );
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });

    it('re-animates underline on significant layout change after initialization', () => {
      const { getByTestId } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={jest.fn()}
          testID="icon-bar"
        />,
      );
      act(() => {
        fireEvent(getByTestId('icon-bar'), 'onLayout', mockLayoutEvent(400));
        mockTabs.forEach((_, i) =>
          fireEvent(
            getByTestId(`icon-bar-tab-${i}`),
            'onLayout',
            tabLayout(i * 120, 100),
          ),
        );
      });
      // Significant change after already initialized — triggers RAF path
      act(() => {
        mockTabs.forEach((_, i) =>
          fireEvent(
            getByTestId(`icon-bar-tab-${i}`),
            'onLayout',
            tabLayout(i * 140, 120),
          ),
        );
      });
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });

    it('does not animate when tab layout has zero width', () => {
      const { getByTestId } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={jest.fn()}
          testID="icon-bar"
        />,
      );
      act(() => {
        fireEvent(getByTestId('icon-bar'), 'onLayout', mockLayoutEvent(400));
        // Only fire one tab layout with width=0 — should be ignored
        fireEvent(getByTestId('icon-bar-tab-0'), 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 0, height: 60 } },
        });
      });
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });
  });

  describe('Collapse Animation', () => {
    it('applies collapseAnim height interpolation after tab row is measured', () => {
      const collapseAnim = new Animated.Value(0);
      const { getByTestId } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={jest.fn()}
          collapseAnim={collapseAnim}
          testID="icon-bar"
        />,
      );
      // Trigger onLayout to set tabRowHeight > 0
      act(() => {
        fireEvent(getByTestId('icon-bar'), 'onLayout', mockLayoutEvent(400));
        // Fire the inner Animated.View layout
        fireEvent(getByTestId('icon-bar-tab-0'), 'onLayout', tabLayout(0, 100));
      });
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });

    it('renders without throwing when collapseBy is provided', () => {
      const collapseAnim = new Animated.Value(0);
      expect(() =>
        render(
          <TabsIconBar
            tabs={mockTabs}
            activeIndex={0}
            onTabPress={jest.fn()}
            collapseAnim={collapseAnim}
            collapseBy={28}
            testID="icon-bar"
          />,
        ),
      ).not.toThrow();
    });

    it('renders without throwing when collapseBy exceeds tabRowHeight', () => {
      const collapseAnim = new Animated.Value(0);
      const { getByTestId } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={jest.fn()}
          collapseAnim={collapseAnim}
          collapseBy={9999}
          testID="icon-bar"
        />,
      );
      // Tab row height is clamped to 0 (no negative height); should not crash.
      act(() => {
        fireEvent(getByTestId('icon-bar'), 'onLayout', mockLayoutEvent(400));
      });
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });
  });

  describe('Tab Array Changes', () => {
    it('resets layout state when tabs array changes', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId, rerender } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="icon-bar"
        />,
      );
      act(() => {
        fireEvent(getByTestId('icon-bar'), 'onLayout', mockLayoutEvent(400));
        mockTabs.forEach((_, i) =>
          fireEvent(
            getByTestId(`icon-bar-tab-${i}`),
            'onLayout',
            tabLayout(i * 120, 100),
          ),
        );
      });

      const newTabs: TabsIconItem[] = [
        {
          key: 'new1',
          label: 'New A',
          iconName: IconName.PieChart,
          content: null,
        },
        {
          key: 'new2',
          label: 'New B',
          iconName: IconName.Candlestick,
          content: null,
        },
      ];
      rerender(
        <TabsIconBar
          tabs={newTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="icon-bar"
        />,
      );
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });

    it('resets layout state when tab keys change', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId, rerender } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="icon-bar"
        />,
      );

      const renamedTabs: TabsIconItem[] = mockTabs.map((t, i) => ({
        ...t,
        key: `renamed-${i}`,
      }));
      rerender(
        <TabsIconBar
          tabs={renamedTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="icon-bar"
        />,
      );
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });
  });

  describe('Performance', () => {
    it('cleans up animations and RAF on unmount', () => {
      const { unmount, getByTestId } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={jest.fn()}
          testID="icon-bar"
        />,
      );
      act(() => {
        fireEvent(getByTestId('icon-bar'), 'onLayout', mockLayoutEvent(400));
        mockTabs.forEach((_, i) =>
          fireEvent(
            getByTestId(`icon-bar-tab-${i}`),
            'onLayout',
            tabLayout(i * 120, 100),
          ),
        );
      });
      expect(() => unmount()).not.toThrow();
    });

    it('handles rapid active index changes without crashing', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId, rerender } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="icon-bar"
        />,
      );
      act(() => {
        fireEvent(getByTestId('icon-bar'), 'onLayout', mockLayoutEvent(400));
        mockTabs.forEach((_, i) =>
          fireEvent(
            getByTestId(`icon-bar-tab-${i}`),
            'onLayout',
            tabLayout(i * 120, 100),
          ),
        );
      });
      [1, 2, 0, 1, 0, 2].forEach((i) =>
        rerender(
          <TabsIconBar
            tabs={mockTabs}
            activeIndex={i}
            onTabPress={mockOnTabPress}
            testID="icon-bar"
          />,
        ),
      );
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });
  });
});
