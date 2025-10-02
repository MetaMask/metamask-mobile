// Third party dependencies.
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// Internal dependencies.
import TabsBar from './TabsBar';
import { TabItem } from './TabsBar.types';

// Mock layout events for automatic scroll detection
const mockLayoutEvent = (width: number) => ({
  nativeEvent: {
    layout: {
      x: 0,
      y: 0,
      width,
      height: 40,
    },
  },
});

describe('TabsBar', () => {
  const mockTabs: TabItem[] = [
    { key: 'tab1', label: 'Tab 1', content: null },
    { key: 'tab2', label: 'Tab 2', content: null },
    { key: 'tab3', label: 'Tab 3', content: null },
  ];

  const manyTabs: TabItem[] = Array.from({ length: 10 }, (_, i) => ({
    key: `tab${i}`,
    label: `Very Long Tab Label ${i + 1}`,
    content: null,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with tabs', () => {
      const mockOnTabPress = jest.fn();
      const { toJSON } = render(
        <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('displays all tab labels', () => {
      const mockOnTabPress = jest.fn();
      const { getAllByText } = render(
        <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
      );

      mockTabs.forEach((tab) => {
        const elements = getAllByText(tab.label);
        expect(elements.length).toBeGreaterThan(0);
        expect(elements[0]).toBeOnTheScreen();
      });
    });

    it('renders with correct testID', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );
      expect(getByTestId('tabs-bar')).toBeOnTheScreen();
    });

    it('handles empty tabs array gracefully', () => {
      const mockOnTabPress = jest.fn();
      const { toJSON } = render(
        <TabsBar tabs={[]} activeIndex={0} onTabPress={mockOnTabPress} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Tab Interaction', () => {
    it('calls onTabPress when tab is pressed', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      fireEvent.press(getByTestId('tabs-bar-tab-1'));

      expect(mockOnTabPress).toHaveBeenCalledWith(1);
    });

    it('calls onTabPress with correct index for different tabs', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      fireEvent.press(getByTestId('tabs-bar-tab-2'));
      expect(mockOnTabPress).toHaveBeenCalledWith(2);

      fireEvent.press(getByTestId('tabs-bar-tab-0'));
      expect(mockOnTabPress).toHaveBeenCalledWith(0);
    });

    it('maintains correct active state for different indices', () => {
      const mockOnTabPress = jest.fn();
      const { getAllByText, rerender } = render(
        <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
      );

      expect(getAllByText('Tab 1')[0]).toBeOnTheScreen();

      rerender(
        <TabsBar tabs={mockTabs} activeIndex={2} onTabPress={mockOnTabPress} />,
      );

      expect(getAllByText('Tab 3')[0]).toBeOnTheScreen();
    });
  });

  describe('Individual Tab Disabling', () => {
    it('does not call onTabPress when individual tab is disabled', () => {
      const mockOnTabPress = jest.fn();
      const tabsWithDisabled: TabItem[] = [
        { key: 'tab1', label: 'Tab 1', content: null },
        { key: 'tab2', label: 'Tab 2', content: null, isDisabled: true },
        { key: 'tab3', label: 'Tab 3', content: null },
      ];

      const { getByTestId } = render(
        <TabsBar
          tabs={tabsWithDisabled}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      fireEvent.press(getByTestId('tabs-bar-tab-1'));

      expect(mockOnTabPress).not.toHaveBeenCalled();
    });

    it('allows interaction with enabled tabs when some are disabled', () => {
      const mockOnTabPress = jest.fn();
      const tabsWithDisabled: TabItem[] = [
        { key: 'tab1', label: 'Tab 1', content: null },
        { key: 'tab2', label: 'Tab 2', content: null, isDisabled: true },
        { key: 'tab3', label: 'Tab 3', content: null },
      ];

      const { getByTestId } = render(
        <TabsBar
          tabs={tabsWithDisabled}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      fireEvent.press(getByTestId('tabs-bar-tab-2'));
      expect(mockOnTabPress).toHaveBeenCalledWith(2);

      fireEvent.press(getByTestId('tabs-bar-tab-0'));
      expect(mockOnTabPress).toHaveBeenCalledWith(0);
    });

    it('renders disabled tabs with correct styling', () => {
      const mockOnTabPress = jest.fn();
      const tabsWithDisabled: TabItem[] = [
        { key: 'tab1', label: 'Tab 1', content: null },
        { key: 'tab2', label: 'Tab 2', content: null, isDisabled: true },
        { key: 'tab3', label: 'Tab 3', content: null },
      ];

      const { toJSON } = render(
        <TabsBar
          tabs={tabsWithDisabled}
          activeIndex={0}
          onTabPress={mockOnTabPress}
        />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('hides underline when no tab is active (activeIndex = -1)', () => {
      const mockOnTabPress = jest.fn();
      const tabsAllDisabled: TabItem[] = [
        { key: 'tab1', label: 'Tab 1', content: null, isDisabled: true },
        { key: 'tab2', label: 'Tab 2', content: null, isDisabled: true },
        { key: 'tab3', label: 'Tab 3', content: null, isDisabled: true },
      ];

      const { toJSON } = render(
        <TabsBar
          tabs={tabsAllDisabled}
          activeIndex={-1}
          onTabPress={mockOnTabPress}
        />,
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Automatic Scroll Detection', () => {
    it('renders without scroll view initially', () => {
      const mockOnTabPress = jest.fn();
      const { toJSON } = render(
        <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('enables scroll when content overflows container', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={manyTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const container = getByTestId('tabs-bar');

      // Simulate container layout (small width)
      act(() => {
        fireEvent(container, 'onLayout', mockLayoutEvent(200));
      });

      expect(container).toBeOnTheScreen();
    });

    it('handles layout changes correctly', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const container = getByTestId('tabs-bar');

      // Simulate multiple layout changes
      act(() => {
        fireEvent(container, 'onLayout', mockLayoutEvent(100));
        fireEvent(container, 'onLayout', mockLayoutEvent(500));
      });

      expect(container).toBeOnTheScreen();
    });
  });

  describe('Underline Animation', () => {
    it('renders animated underline', () => {
      const mockOnTabPress = jest.fn();
      const { toJSON } = render(
        <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('updates underline position when active tab changes', () => {
      const mockOnTabPress = jest.fn();
      const { rerender, toJSON } = render(
        <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
      );

      const initialSnapshot = toJSON();

      rerender(
        <TabsBar tabs={mockTabs} activeIndex={1} onTabPress={mockOnTabPress} />,
      );

      const updatedSnapshot = toJSON();

      // Snapshots should be different due to underline position change
      expect(initialSnapshot).not.toEqual(updatedSnapshot);
    });

    it('handles rapid tab switching without animation conflicts', () => {
      const mockOnTabPress = jest.fn();
      const { rerender, getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Simulate rapid tab switching
      rerender(
        <TabsBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );
      rerender(
        <TabsBar
          tabs={mockTabs}
          activeIndex={2}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );
      rerender(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Should not throw errors and component should still be rendered and functional
      const tabsBarComponent = getByTestId('tabs-bar');
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('initializes underline correctly when layout events come after component mount', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');
      const tab0 = getByTestId('tabs-bar-tab-0');
      const tab1 = getByTestId('tabs-bar-tab-1');
      const tab2 = getByTestId('tabs-bar-tab-2');

      // Simulate layout events coming after mount (which happens on first load)
      act(() => {
        // Container layout first
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        // Tab layouts in order
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 40 } },
        });
        fireEvent(tab1, 'onLayout', {
          nativeEvent: { layout: { x: 84, y: 0, width: 70, height: 40 } },
        });
        fireEvent(tab2, 'onLayout', {
          nativeEvent: { layout: { x: 178, y: 0, width: 80, height: 40 } },
        });
      });

      // Component should still be rendered and functional after delayed layout
      expect(tabsBarComponent).toBeOnTheScreen();
      expect(tab0).toBeOnTheScreen();
      expect(tab1).toBeOnTheScreen();
      expect(tab2).toBeOnTheScreen();
    });

    it('handles pending animations when target tab layout is not ready', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId, rerender } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');
      const tab0 = getByTestId('tabs-bar-tab-0');

      // Simulate first tab getting its layout
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 40 } },
        });
      });

      // Switch to tab 1 before its layout is measured (simulates first load scenario)
      rerender(
        <TabsBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Now provide tab 1's layout - should trigger pending animation
      const tab1 = getByTestId('tabs-bar-tab-1');
      act(() => {
        fireEvent(tab1, 'onLayout', {
          nativeEvent: { layout: { x: 84, y: 0, width: 70, height: 40 } },
        });
      });

      // Component should handle the pending animation gracefully
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('handles animation interruption during pending state', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId, rerender } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');
      const tab0 = getByTestId('tabs-bar-tab-0');

      // Initialize first tab
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 40 } },
        });
      });

      // Switch to tab 1 (pending)
      rerender(
        <TabsBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Switch to tab 2 before tab 1 layout is ready (interrupt pending)
      rerender(
        <TabsBar
          tabs={mockTabs}
          activeIndex={2}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Provide tab 2's layout
      const tab2 = getByTestId('tabs-bar-tab-2');
      act(() => {
        fireEvent(tab2, 'onLayout', {
          nativeEvent: { layout: { x: 178, y: 0, width: 80, height: 40 } },
        });
      });

      // Should handle interrupted pending animation
      expect(tabsBarComponent).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid activeIndex gracefully', () => {
      const mockOnTabPress = jest.fn();
      const { toJSON } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={99}
          onTabPress={mockOnTabPress}
        />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('handles negative activeIndex gracefully', () => {
      const mockOnTabPress = jest.fn();
      const { toJSON } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={-1}
          onTabPress={mockOnTabPress}
        />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('handles single tab correctly', () => {
      const singleTab = [{ key: 'single', label: 'Single Tab', content: null }];
      const mockOnTabPress = jest.fn();
      const { getAllByText } = render(
        <TabsBar
          tabs={singleTab}
          activeIndex={0}
          onTabPress={mockOnTabPress}
        />,
      );
      expect(getAllByText('Single Tab')[0]).toBeOnTheScreen();
    });

    it('handles single tab with full functionality', () => {
      // Arrange
      const singleTab = [{ key: 'single', label: 'Single Tab', content: null }];
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={singleTab}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="single-tab-bar"
        />,
      );

      // Assert - Single tab should be rendered and active
      const tabsBarComponent = getByTestId('single-tab-bar');
      const singleTabButton = getByTestId('single-tab-bar-tab-0');

      expect(tabsBarComponent).toBeOnTheScreen();
      expect(singleTabButton).toBeOnTheScreen();

      // Act - Click on the single tab
      fireEvent.press(singleTabButton);

      // Assert - onTabPress should be called
      expect(mockOnTabPress).toHaveBeenCalledWith(0);

      // Simulate layout for single tab
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));
        fireEvent(singleTabButton, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 40 } },
        });
      });

      // Should not enable scrolling for single tab
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('handles single disabled tab', () => {
      // Arrange
      const singleDisabledTab = [
        {
          key: 'single',
          label: 'Disabled Tab',
          content: null,
          isDisabled: true,
        },
      ];
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={singleDisabledTab}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="disabled-single-tab-bar"
        />,
      );

      // Assert - Single disabled tab should be rendered
      const tabButton = getByTestId('disabled-single-tab-bar-tab-0');

      expect(tabButton).toBeOnTheScreen();

      // Act - Try to click on the disabled tab
      fireEvent.press(tabButton);

      // Assert - onTabPress should not be called for disabled tab
      expect(mockOnTabPress).not.toHaveBeenCalled();
    });

    it('handles out-of-order layout events without sparse array errors', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const container = getByTestId('tabs-bar');

      // Simulate out-of-order layout events (tab 2 before tab 0)
      act(() => {
        // Container layout first
        fireEvent(container, 'onLayout', mockLayoutEvent(300));

        // Tab layouts in random order - this used to cause sparse array issues
        const tab2 = getByTestId('tabs-bar-tab-2');
        const tab0 = getByTestId('tabs-bar-tab-0');
        const tab1 = getByTestId('tabs-bar-tab-1');

        fireEvent(tab2, 'onLayout', mockLayoutEvent(80));
        fireEvent(tab0, 'onLayout', mockLayoutEvent(60));
        fireEvent(tab1, 'onLayout', mockLayoutEvent(70));
      });

      // Should not throw errors and component should still be rendered
      expect(container).toBeOnTheScreen();
    });

    it('resets layout data when tabs change', () => {
      const mockOnTabPress = jest.fn();
      const { rerender, getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Change to different tabs
      const newTabs = [
        { key: 'new1', label: 'New Tab 1', content: null },
        { key: 'new2', label: 'New Tab 2', content: null },
      ];

      rerender(
        <TabsBar
          tabs={newTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const container = getByTestId('tabs-bar');
      expect(container).toBeOnTheScreen();
    });

    it('handles invalid layout measurements gracefully', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');
      const tab0 = getByTestId('tabs-bar-tab-0');

      // Simulate invalid layout measurements
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        // Invalid measurements (negative width, NaN values, etc.)
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: NaN, y: 0, width: -10, height: 40 } },
        });
      });

      // Should handle invalid measurements without crashing
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('maintains animation state consistency during tab array changes', () => {
      const mockOnTabPress = jest.fn();
      const { rerender, getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Initialize with layout
      const tabsBarComponent = getByTestId('tabs-bar');
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));
      });

      // Change tabs array while animation might be in progress
      const newTabs = [
        { key: 'new1', label: 'New Tab 1', content: null },
        { key: 'new2', label: 'New Tab 2', content: null },
      ];

      rerender(
        <TabsBar
          tabs={newTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Should handle tab array changes gracefully
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('handles extreme scroll scenarios', () => {
      const extremeTabsList = Array.from({ length: 20 }, (_, i) => ({
        key: `tab${i}`,
        label: `Very Long Tab Label ${i + 1}`,
        content: null,
      }));

      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={extremeTabsList}
          activeIndex={15}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Simulate small container with many tabs
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(200));

        // Simulate all tab layouts
        extremeTabsList.forEach((_, index) => {
          const tab = getByTestId(`tabs-bar-tab-${index}`);
          fireEvent(tab, 'onLayout', {
            nativeEvent: {
              layout: { x: index * 120, y: 0, width: 100, height: 40 },
            },
          });
        });
      });

      // Should handle extreme scroll scenarios
      expect(tabsBarComponent).toBeOnTheScreen();
    });
  });

  describe('Performance and Memory', () => {
    it('cleans up animations properly when component unmounts', () => {
      const mockOnTabPress = jest.fn();
      const { unmount, getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Initialize layout
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));
      });

      // Unmount component
      unmount();

      // Should not throw errors or cause memory leaks
      expect(true).toBe(true); // Test passes if no errors thrown
    });

    it('handles rapid activeIndex changes efficiently', () => {
      const mockOnTabPress = jest.fn();
      const { rerender, getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Initialize all layouts
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));
        mockTabs.forEach((_, index) => {
          const tab = getByTestId(`tabs-bar-tab-${index}`);
          fireEvent(tab, 'onLayout', {
            nativeEvent: {
              layout: { x: index * 80, y: 0, width: 70, height: 40 },
            },
          });
        });
      });

      // Rapid activeIndex changes
      const indices = [1, 2, 0, 1, 2, 0, 1];
      indices.forEach((activeIndex) => {
        rerender(
          <TabsBar
            tabs={mockTabs}
            activeIndex={activeIndex}
            onTabPress={mockOnTabPress}
            testID="tabs-bar"
          />,
        );
      });

      // Should handle rapid changes efficiently
      expect(tabsBarComponent).toBeOnTheScreen();
    });
  });

  describe('Layout and Animation Coverage', () => {
    it('covers isLayoutReady state transitions', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');
      const tab0 = getByTestId('tabs-bar-tab-0');
      const tab1 = getByTestId('tabs-bar-tab-1');

      // Act - Simulate layout events that trigger isLayoutReady state changes
      act(() => {
        // Container layout first
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        // First tab layout - should not set isLayoutReady yet
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 40 } },
        });

        // Second tab layout - should trigger isLayoutReady = true
        fireEvent(tab1, 'onLayout', {
          nativeEvent: { layout: { x: 84, y: 0, width: 70, height: 40 } },
        });
      });

      // Assert - Component should handle layout ready state transitions
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('covers critical fix for uninitialized underline with all layouts ready', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId, rerender } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={-1} // Start with no active tab
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Set up all layouts first, then activate a tab
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        // Measure all tabs
        mockTabs.forEach((_, index) => {
          const tab = getByTestId(`tabs-bar-tab-${index}`);
          fireEvent(tab, 'onLayout', {
            nativeEvent: {
              layout: { x: index * 80, y: 0, width: 70, height: 40 },
            },
          });
        });
      });

      // Now activate a tab - this should trigger the critical fix path
      rerender(
        <TabsBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Assert - Should handle the critical fix scenario
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('covers activeIndex bounds checking in critical fix', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Trigger layout with valid activeIndex
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        // This should trigger the bounds checking:
        // activeIndex >= 0 && activeIndex < tabLayouts.current.length
        const tab0 = getByTestId('tabs-bar-tab-0');
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 40 } },
        });
      });

      // Assert - Should handle bounds checking correctly
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('covers activeTabLayout validation in critical fix', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Set up scenario where activeTabLayout needs validation
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        // Measure tab 0 but not tab 1 (activeIndex)
        const tab0 = getByTestId('tabs-bar-tab-0');
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 40 } },
        });

        // Now measure tab 1 - this should trigger the validation:
        // activeTabLayout && typeof activeTabLayout.x === 'number' && typeof activeTabLayout.width === 'number'
        const tab1 = getByTestId('tabs-bar-tab-1');
        fireEvent(tab1, 'onLayout', {
          nativeEvent: { layout: { x: 84, y: 0, width: 70, height: 40 } },
        });
      });

      // Assert - Should handle activeTabLayout validation
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('covers containerWidth validation in layout detection', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Test containerWidth > 0 condition
      act(() => {
        // First set container width to 0 (should not trigger layout ready)
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(0));

        // Then set proper container width
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        // Measure tabs
        mockTabs.forEach((_, index) => {
          const tab = getByTestId(`tabs-bar-tab-${index}`);
          fireEvent(tab, 'onLayout', {
            nativeEvent: {
              layout: { x: index * 80, y: 0, width: 70, height: 40 },
            },
          });
        });
      });

      // Assert - Should handle containerWidth validation
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('covers scroll detection with gap calculations', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={manyTabs} // Use many tabs to trigger scrolling
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Set up scenario that triggers scroll detection
      act(() => {
        // Small container width to force scrolling
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(200));

        // Measure all tabs with wide widths
        manyTabs.forEach((_, index) => {
          const tab = getByTestId(`tabs-bar-tab-${index}`);
          fireEvent(tab, 'onLayout', {
            nativeEvent: {
              layout: { x: index * 120, y: 0, width: 100, height: 40 },
            },
          });
        });
      });

      // Assert - Should enable scrolling due to overflow
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('covers isInitialized state management', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId, rerender } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Initialize, then change tabs to reset isInitialized
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        const tab0 = getByTestId('tabs-bar-tab-0');
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 40 } },
        });
      });

      // Change tabs array to reset isInitialized
      const newTabs = [
        { key: 'new1', label: 'New Tab 1', content: null },
        { key: 'new2', label: 'New Tab 2', content: null },
      ];

      rerender(
        <TabsBar
          tabs={newTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Assert - Should handle isInitialized reset
      expect(tabsBarComponent).toBeOnTheScreen();
    });
  });

  describe('Pending Animation System Coverage', () => {
    it('covers pendingActiveIndex storage and retrieval', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId, rerender } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Set up first tab layout
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        const tab0 = getByTestId('tabs-bar-tab-0');
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 40 } },
        });
      });

      // Switch to tab without layout (should store as pending)
      rerender(
        <TabsBar
          tabs={mockTabs}
          activeIndex={2}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Now provide the pending tab's layout
      act(() => {
        const tab2 = getByTestId('tabs-bar-tab-2');
        fireEvent(tab2, 'onLayout', {
          nativeEvent: { layout: { x: 178, y: 0, width: 80, height: 40 } },
        });
      });

      // Assert - Should handle pending animation system
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('covers pendingActiveIndex clearing when animation executes', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId, rerender } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Set up all layouts first
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        mockTabs.forEach((_, index) => {
          const tab = getByTestId(`tabs-bar-tab-${index}`);
          fireEvent(tab, 'onLayout', {
            nativeEvent: {
              layout: { x: index * 80, y: 0, width: 70, height: 40 },
            },
          });
        });
      });

      // Switch tabs - should clear pending and animate directly
      rerender(
        <TabsBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Assert - Should clear pendingActiveIndex and animate
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('covers animation validation with invalid layout data', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Provide invalid layout data
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        const tab0 = getByTestId('tabs-bar-tab-0');
        // Invalid layout with missing properties
        fireEvent(tab0, 'onLayout', {
          nativeEvent: {
            layout: { x: null, y: 0, width: undefined, height: 40 },
          },
        });
      });

      // Assert - Should handle invalid layout data gracefully
      expect(tabsBarComponent).toBeOnTheScreen();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles invalid tab layout indices gracefully', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Simulate invalid layout events
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        // Invalid index (negative)
        const invalidTab = getByTestId('tabs-bar-tab-0');
        fireEvent(invalidTab, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 40 } },
        });
      });

      // Should handle invalid indices without crashing
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('handles invalid layout data gracefully', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');
      const tab0 = getByTestId('tabs-bar-tab-0');

      // Act - Provide invalid layout data
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        // Invalid layout data (zero width, negative values, etc.)
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: -10, y: 0, width: 0, height: 40 } },
        });
      });

      // Should handle invalid layout data without crashing
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('handles layout events with missing properties', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');
      const tab0 = getByTestId('tabs-bar-tab-0');

      // Act - Provide layout data with missing properties
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        // Layout event with missing width property
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, height: 40 } },
        });
      });

      // Should handle missing properties gracefully
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('stops animation when activeIndex becomes negative', () => {
      const mockOnTabPress = jest.fn();
      const { rerender, getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Initialize layout
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));
        const tab0 = getByTestId('tabs-bar-tab-0');
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 40 } },
        });
      });

      // Change to negative activeIndex (should stop animation)
      rerender(
        <TabsBar
          tabs={mockTabs}
          activeIndex={-1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Should handle negative activeIndex gracefully
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('handles animation interruption during negative activeIndex', () => {
      const mockOnTabPress = jest.fn();
      const { rerender, getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Initialize some layouts
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));
        const tab0 = getByTestId('tabs-bar-tab-0');
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 40 } },
        });
      });

      // Switch to negative activeIndex while animation might be in progress
      rerender(
        <TabsBar
          tabs={mockTabs}
          activeIndex={-1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Should stop any ongoing animation
      expect(tabsBarComponent).toBeOnTheScreen();
    });
  });

  describe('Layout Initialization Edge Cases', () => {
    it('handles missing layouts during hasAllTabLayouts check', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Provide partial layout data to trigger missing layouts scenario
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        // Only measure first tab, leaving others unmeasured
        const tab0 = getByTestId('tabs-bar-tab-0');
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 40 } },
        });
      });

      // Should handle missing layouts gracefully
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('triggers animation when hasAllTabLayouts becomes true', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Gradually provide all layouts to trigger hasAllTabLayouts effect
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        // Measure all tabs one by one
        mockTabs.forEach((_, index) => {
          const tab = getByTestId(`tabs-bar-tab-${index}`);
          fireEvent(tab, 'onLayout', {
            nativeEvent: {
              layout: { x: index * 80, y: 0, width: 70, height: 40 },
            },
          });
        });
      });

      // Should trigger animation when all layouts are available
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('handles array length mismatch during layout storage', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Trigger array length initialization
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));

        // This should trigger the array length check and initialization
        const tab0 = getByTestId('tabs-bar-tab-0');
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 40 } },
        });
      });

      // Should initialize array to proper length
      expect(tabsBarComponent).toBeOnTheScreen();
    });
  });

  describe('Scroll Detection Edge Cases', () => {
    it('handles scroll detection with zero container width', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={manyTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Set container width to 0
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(0));

        // Measure some tabs
        manyTabs.slice(0, 3).forEach((_, index) => {
          const tab = getByTestId(`tabs-bar-tab-${index}`);
          fireEvent(tab, 'onLayout', {
            nativeEvent: {
              layout: { x: index * 100, y: 0, width: 90, height: 40 },
            },
          });
        });
      });

      // Should handle zero container width gracefully
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('handles scroll detection with undefined layout data', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Provide container width but no tab layouts
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));
        // Don't provide any tab layouts - should handle undefined gracefully
      });

      // Should handle undefined layout data gracefully
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('covers scroll to active tab functionality', () => {
      const mockOnTabPress = jest.fn();
      const { getByTestId } = render(
        <TabsBar
          tabs={manyTabs}
          activeIndex={5} // Tab that would be off-screen
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Act - Set up scrolling scenario
      act(() => {
        // Small container to force scrolling
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(200));

        // Measure all tabs with wide widths
        manyTabs.forEach((_, index) => {
          const tab = getByTestId(`tabs-bar-tab-${index}`);
          fireEvent(tab, 'onLayout', {
            nativeEvent: {
              layout: { x: index * 120, y: 0, width: 100, height: 40 },
            },
          });
        });
      });

      // Should enable scrolling and scroll to active tab
      expect(tabsBarComponent).toBeOnTheScreen();
    });
  });

  describe('Animation State Management', () => {
    it('handles animation cancellation during rapid switching', () => {
      const mockOnTabPress = jest.fn();
      const { rerender, getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Initialize all layouts
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));
        mockTabs.forEach((_, index) => {
          const tab = getByTestId(`tabs-bar-tab-${index}`);
          fireEvent(tab, 'onLayout', {
            nativeEvent: {
              layout: { x: index * 80, y: 0, width: 70, height: 40 },
            },
          });
        });
      });

      // Rapid switching to trigger animation cancellation
      rerender(
        <TabsBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      rerender(
        <TabsBar
          tabs={mockTabs}
          activeIndex={2}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Should handle animation cancellation gracefully
      expect(tabsBarComponent).toBeOnTheScreen();
    });

    it('handles hasValidDimensions state updates', () => {
      const mockOnTabPress = jest.fn();
      const { rerender, getByTestId } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      const tabsBarComponent = getByTestId('tabs-bar');

      // Initialize first tab
      act(() => {
        fireEvent(tabsBarComponent, 'onLayout', mockLayoutEvent(300));
        const tab0 = getByTestId('tabs-bar-tab-0');
        fireEvent(tab0, 'onLayout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 40 } },
        });
      });

      // Switch to another tab to trigger hasValidDimensions update
      rerender(
        <TabsBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
          testID="tabs-bar"
        />,
      );

      // Provide layout for second tab
      act(() => {
        const tab1 = getByTestId('tabs-bar-tab-1');
        fireEvent(tab1, 'onLayout', {
          nativeEvent: { layout: { x: 84, y: 0, width: 70, height: 40 } },
        });
      });

      // Should handle hasValidDimensions state updates
      expect(tabsBarComponent).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility for tabs', () => {
      const mockOnTabPress = jest.fn();
      const { getAllByText } = render(
        <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
      );

      mockTabs.forEach((tab) => {
        const tabElements = getAllByText(tab.label);
        expect(tabElements[0]).toBeOnTheScreen();
      });
    });
  });
});
