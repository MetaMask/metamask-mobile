// Third party dependencies.
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// Internal dependencies.
import TabsIconBar from './TabsIconBar';
import { TabsIconItem } from './TabsIconBar.types';
import { IconName } from '../../../components/Icons/Icon/Icon.types';

const mockLayoutEvent = (width: number) => ({
  nativeEvent: { layout: { x: 0, y: 0, width, height: 60 } },
});

describe('TabsIconBar', () => {
  const mockTabs: TabsIconItem[] = [
    {
      key: 'tab1',
      label: 'Portfolio',
      iconName: IconName.Portfolio,
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
      iconName: IconName.Predict,
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
      mockTabs.forEach((tab) => {
        expect(getByText(tab.label)).toBeOnTheScreen();
      });
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
          iconName: IconName.Portfolio,
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
    it('renders with fillWidth prop without throwing', () => {
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
  });

  describe('Layout and Underline', () => {
    it('handles layout events and renders without crashing', () => {
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
        mockTabs.forEach((_, i) => {
          fireEvent(getByTestId(`icon-bar-tab-${i}`), 'onLayout', {
            nativeEvent: {
              layout: { x: i * 120, y: 0, width: 100, height: 60 },
            },
          });
        });
      });
      expect(getByTestId('icon-bar')).toBeOnTheScreen();
    });

    it('updates when active tab changes', () => {
      const mockOnTabPress = jest.fn();
      const { rerender, toJSON } = render(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={0}
          onTabPress={mockOnTabPress}
        />,
      );
      const before = toJSON();
      rerender(
        <TabsIconBar
          tabs={mockTabs}
          activeIndex={1}
          onTabPress={mockOnTabPress}
        />,
      );
      expect(toJSON()).not.toEqual(before);
    });
  });

  describe('Performance', () => {
    it('cleans up animations on unmount without throwing', () => {
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
      });
      expect(() => unmount()).not.toThrow();
    });
  });
});
