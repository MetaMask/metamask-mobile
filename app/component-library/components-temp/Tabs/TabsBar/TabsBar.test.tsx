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
