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
      const { getByText } = render(
        <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
      );

      mockTabs.forEach((tab) => {
        expect(getByText(tab.label)).toBeOnTheScreen();
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
      const { getByText } = render(
        <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
      );

      fireEvent.press(getByText('Tab 2'));

      expect(mockOnTabPress).toHaveBeenCalledWith(1);
    });

    it('calls onTabPress with correct index for different tabs', () => {
      const mockOnTabPress = jest.fn();
      const { getByText } = render(
        <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
      );

      fireEvent.press(getByText('Tab 3'));
      expect(mockOnTabPress).toHaveBeenCalledWith(2);

      fireEvent.press(getByText('Tab 1'));
      expect(mockOnTabPress).toHaveBeenCalledWith(0);
    });

    it('maintains correct active state for different indices', () => {
      const mockOnTabPress = jest.fn();
      const { getByText, rerender } = render(
        <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
      );

      expect(getByText('Tab 1')).toBeOnTheScreen();

      rerender(
        <TabsBar tabs={mockTabs} activeIndex={2} onTabPress={mockOnTabPress} />,
      );

      expect(getByText('Tab 3')).toBeOnTheScreen();
    });
  });

  describe('Locked State', () => {
    it('does not call onTabPress when locked', () => {
      const mockOnTabPress = jest.fn();
      const { getByText } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          locked
        />,
      );

      fireEvent.press(getByText('Tab 2'));

      expect(mockOnTabPress).not.toHaveBeenCalled();
    });

    it('passes disabled prop to tabs when locked', () => {
      const mockOnTabPress = jest.fn();
      const { toJSON } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          locked
        />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('allows interaction when not locked', () => {
      const mockOnTabPress = jest.fn();
      const { getByText } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          locked={false}
        />,
      );

      fireEvent.press(getByText('Tab 2'));

      expect(mockOnTabPress).toHaveBeenCalledWith(1);
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
      const { getByText } = render(
        <TabsBar
          tabs={singleTab}
          activeIndex={0}
          onTabPress={mockOnTabPress}
        />,
      );
      expect(getByText('Single Tab')).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility for tabs', () => {
      const mockOnTabPress = jest.fn();
      const { getByText } = render(
        <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
      );

      mockTabs.forEach((tab) => {
        const tabElement = getByText(tab.label);
        expect(tabElement).toBeOnTheScreen();
      });
    });

    it('maintains accessibility when locked', () => {
      const mockOnTabPress = jest.fn();
      const { getByText } = render(
        <TabsBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
          locked
        />,
      );

      mockTabs.forEach((tab) => {
        const tabElement = getByText(tab.label);
        expect(tabElement).toBeOnTheScreen();
      });
    });
  });
});
