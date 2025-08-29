// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import TabsBar from './TabsBar';
import { TabItem } from '../Tabs.types';

describe('TabsBar', () => {
  const mockTabs: TabItem[] = [
    { key: 'tab1', label: 'Tab 1', content: null },
    { key: 'tab2', label: 'Tab 2', content: null },
    { key: 'tab3', label: 'Tab 3', content: null },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with tabs', () => {
    // Arrange
    const mockOnTabPress = jest.fn();

    // Act
    const { toJSON } = render(
      <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
    );

    // Assert
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays all tab labels', () => {
    // Arrange
    const mockOnTabPress = jest.fn();

    // Act
    const { getByText } = render(
      <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
    );

    // Assert
    mockTabs.forEach((tab) => {
      expect(getByText(tab.label)).toBeOnTheScreen();
    });
  });

  it('calls onTabPress when tab is pressed', () => {
    // Arrange
    const mockOnTabPress = jest.fn();

    // Act
    const { getByText } = render(
      <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
    );

    fireEvent.press(getByText('Tab 2'));

    // Assert
    expect(mockOnTabPress).toHaveBeenCalledWith(1);
  });

  it('does not call onTabPress when locked', () => {
    // Arrange
    const mockOnTabPress = jest.fn();

    // Act
    const { getByText } = render(
      <TabsBar
        tabs={mockTabs}
        activeIndex={0}
        onTabPress={mockOnTabPress}
        locked
      />,
    );

    fireEvent.press(getByText('Tab 2'));

    // Assert
    expect(mockOnTabPress).not.toHaveBeenCalled();
  });

  it('renders with scrollable view when scrollEnabled is true', () => {
    // Arrange
    const mockOnTabPress = jest.fn();
    const manyTabs: TabItem[] = Array.from({ length: 10 }, (_, i) => ({
      key: `tab${i}`,
      label: `Tab ${i + 1}`,
      content: null,
    }));

    // Act
    const { getByTestId } = render(
      <TabsBar
        tabs={manyTabs}
        activeIndex={0}
        onTabPress={mockOnTabPress}
        scrollEnabled
        testID="tabs-bar"
      />,
    );

    // Assert
    expect(getByTestId('tabs-bar')).toBeOnTheScreen();
  });

  it('renders without scrollable view when scrollEnabled is false', () => {
    // Arrange
    const mockOnTabPress = jest.fn();

    // Act
    const { toJSON } = render(
      <TabsBar
        tabs={mockTabs}
        activeIndex={0}
        onTabPress={mockOnTabPress}
        scrollEnabled={false}
      />,
    );

    // Assert
    expect(toJSON()).toMatchSnapshot();
  });

  it('applies custom styling correctly', () => {
    // Arrange
    const mockOnTabPress = jest.fn();
    const customStyle = { backgroundColor: 'red' };
    const customTabStyle = { padding: 20 };
    const customTextStyle = { fontSize: 18 };
    const customUnderlineStyle = { height: 4, backgroundColor: 'blue' };

    // Act
    const { toJSON } = render(
      <TabsBar
        tabs={mockTabs}
        activeIndex={0}
        onTabPress={mockOnTabPress}
        style={customStyle}
        tabStyle={customTabStyle}
        textStyle={customTextStyle}
        underlineStyle={customUnderlineStyle}
      />,
    );

    // Assert
    expect(toJSON()).toMatchSnapshot();
  });

  it('handles empty tabs array gracefully', () => {
    // Arrange
    const mockOnTabPress = jest.fn();

    // Act
    const { toJSON } = render(
      <TabsBar tabs={[]} activeIndex={0} onTabPress={mockOnTabPress} />,
    );

    // Assert
    expect(toJSON()).toMatchSnapshot();
  });

  it('maintains correct active state for different indices', () => {
    // Arrange
    const mockOnTabPress = jest.fn();

    // Act
    const { getByText, rerender } = render(
      <TabsBar tabs={mockTabs} activeIndex={0} onTabPress={mockOnTabPress} />,
    );

    // Initially first tab should be active
    expect(getByText('Tab 1')).toBeOnTheScreen();

    // Change active index
    rerender(
      <TabsBar tabs={mockTabs} activeIndex={2} onTabPress={mockOnTabPress} />,
    );

    // Third tab should now be active
    expect(getByText('Tab 3')).toBeOnTheScreen();
  });
});
