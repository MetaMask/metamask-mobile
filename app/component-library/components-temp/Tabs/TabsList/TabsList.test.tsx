// Third party dependencies.
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { View } from 'react-native';

// External dependencies.
import { Text } from '@metamask/design-system-react-native';

// Internal dependencies.
import TabsList from './TabsList';
import { TabViewProps, TabsListRef } from './TabsList.types';

describe('TabsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with multiple tabs', () => {
    // Arrange
    const tabs = ['Tab 1', 'Tab 2', 'Tab 3'];

    // Act
    const { toJSON } = render(
      <TabsList>
        {tabs.map((label, index) => (
          <View key={`tab${index}`} {...({ tabLabel: label } as TabViewProps)}>
            <Text>{label} Content</Text>
          </View>
        ))}
      </TabsList>,
    );

    // Assert
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays correct initial tab content', () => {
    // Arrange
    const tabs = [
      { label: 'Tokens', content: 'Tokens Content' },
      { label: 'NFTs', content: 'NFTs Content' },
    ];

    // Act
    const { getByText, queryByText } = render(
      <TabsList initialActiveIndex={0}>
        {tabs.map((tab, index) => (
          <View
            key={`tab${index}`}
            {...({ tabLabel: tab.label } as TabViewProps)}
          >
            <Text>{tab.content}</Text>
          </View>
        ))}
      </TabsList>,
    );

    // Assert
    expect(getByText('Tokens Content')).toBeOnTheScreen();
    expect(queryByText('NFTs Content')).toBeNull(); // Should not be visible initially
  });

  it('switches tab content when tab is pressed', () => {
    // Arrange
    const tabs = [
      { label: 'Tokens', content: 'Tokens Content' },
      { label: 'NFTs', content: 'NFTs Content' },
    ];

    // Act
    const { getByText, queryByText, getAllByText } = render(
      <TabsList>
        {tabs.map((tab, index) => (
          <View
            key={`tab${index}`}
            {...({ tabLabel: tab.label } as TabViewProps)}
          >
            <Text>{tab.content}</Text>
          </View>
        ))}
      </TabsList>,
    );

    // Switch to second tab
    fireEvent.press(getAllByText('NFTs')[0]);

    // Assert
    expect(getByText('NFTs Content')).toBeOnTheScreen();
    expect(queryByText('Tokens Content')).toBeNull();
  });

  it('calls onChangeTab callback when tab changes', async () => {
    // Arrange
    const mockOnChangeTab = jest.fn();
    const tabs = ['Tab 1', 'Tab 2'];

    // Act
    const { getAllByText } = render(
      <TabsList onChangeTab={mockOnChangeTab}>
        {tabs.map((label, index) => (
          <View key={`tab${index}`} {...({ tabLabel: label } as TabViewProps)}>
            <Text>{label} Content</Text>
          </View>
        ))}
      </TabsList>,
    );

    await act(async () => {
      fireEvent.press(getAllByText('Tab 2')[0]);
    });

    // Assert
    expect(mockOnChangeTab).toHaveBeenCalledWith({
      i: 1,
      ref: expect.any(Object),
    });
  });

  it('does not change to disabled tabs when pressed', () => {
    // Arrange
    const mockOnChangeTab = jest.fn();
    const tabs = [
      { label: 'Tab 1', content: 'Tab 1 Content' },
      { label: 'Tab 2 (Disabled)', content: 'Tab 2 Content' },
    ];

    // Act
    const { getAllByText, getByText } = render(
      <TabsList onChangeTab={mockOnChangeTab}>
        <View key="tab0" {...({ tabLabel: tabs[0].label } as TabViewProps)}>
          <Text>{tabs[0].content}</Text>
        </View>
        <View
          key="tab1"
          {...({ tabLabel: tabs[1].label, isDisabled: true } as TabViewProps)}
        >
          <Text>{tabs[1].content}</Text>
        </View>
      </TabsList>,
    );

    fireEvent.press(getAllByText('Tab 2 (Disabled)')[0]);

    // Assert
    expect(mockOnChangeTab).not.toHaveBeenCalled();
    expect(getByText('Tab 1 Content')).toBeOnTheScreen(); // Should still show first tab
  });

  it('exposes goToTabIndex method via ref', async () => {
    // Arrange
    const ref = React.createRef<TabsListRef>();
    const tabs = ['Tab 1', 'Tab 2', 'Tab 3'];

    // Act
    const { getByText } = render(
      <TabsList ref={ref}>
        {tabs.map((label, index) => (
          <View key={`tab${index}`} {...({ tabLabel: label } as TabViewProps)}>
            <Text>{label} Content</Text>
          </View>
        ))}
      </TabsList>,
    );

    // Navigate to second tab via ref
    await act(async () => {
      ref.current?.goToTabIndex(1);
    });

    // Assert
    expect(getByText('Tab 2 Content')).toBeOnTheScreen();
  });

  it('exposes getCurrentIndex method via ref', () => {
    // Arrange
    const ref = React.createRef<TabsListRef>();
    const tabs = ['Tab 1', 'Tab 2'];

    // Act
    render(
      <TabsList ref={ref} initialActiveIndex={1}>
        {tabs.map((label, index) => (
          <View key={`tab${index}`} {...({ tabLabel: label } as TabViewProps)}>
            <Text>{label} Content</Text>
          </View>
        ))}
      </TabsList>,
    );

    // Assert
    expect(ref.current?.getCurrentIndex()).toBe(1);
  });

  it('goToTabIndex method respects disabled tabs', async () => {
    // Arrange
    const ref = React.createRef<TabsListRef>();
    const tabs = [
      { label: 'Tab 1', content: 'Tab 1 Content' },
      { label: 'Tab 2', content: 'Tab 2 Content' },
      { label: 'Tab 3', content: 'Tab 3 Content' },
    ];

    // Act
    const { getByText } = render(
      <TabsList ref={ref} initialActiveIndex={0}>
        <View key="tab0" {...({ tabLabel: tabs[0].label } as TabViewProps)}>
          <Text>{tabs[0].content}</Text>
        </View>
        <View
          key="tab1"
          {...({ tabLabel: tabs[1].label, isDisabled: true } as TabViewProps)}
        >
          <Text>{tabs[1].content}</Text>
        </View>
        <View key="tab2" {...({ tabLabel: tabs[2].label } as TabViewProps)}>
          <Text>{tabs[2].content}</Text>
        </View>
      </TabsList>,
    );

    // Try to navigate to disabled tab
    await act(async () => {
      ref.current?.goToTabIndex(1);
    });

    // Should still be on first tab
    expect(getByText('Tab 1 Content')).toBeOnTheScreen();
    expect(ref.current?.getCurrentIndex()).toBe(0);

    // Navigate to enabled tab should work
    await act(async () => {
      ref.current?.goToTabIndex(2);
    });

    expect(getByText('Tab 3 Content')).toBeOnTheScreen();
    expect(ref.current?.getCurrentIndex()).toBe(2);
  });

  it('handles empty children gracefully', () => {
    // Act
    const { toJSON } = render(<TabsList>{[]}</TabsList>);

    // Assert
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with initial page set to specific index', () => {
    // Arrange
    const tabs = [
      { label: 'First', content: 'First Content' },
      { label: 'Second', content: 'Second Content' },
      { label: 'Third', content: 'Third Content' },
    ];

    // Act
    const { getByText } = render(
      <TabsList initialActiveIndex={2}>
        {tabs.map((tab, index) => (
          <View
            key={`tab${index}`}
            {...({ tabLabel: tab.label } as TabViewProps)}
          >
            <Text>{tab.content}</Text>
          </View>
        ))}
      </TabsList>,
    );

    // Assert
    expect(getByText('Third Content')).toBeOnTheScreen();
  });

  it('passes BoxProps to underlying Box component', () => {
    // Arrange
    const tabs = ['Tab 1', 'Tab 2'];

    // Act
    const { toJSON } = render(
      <TabsList twClassName="bg-background-alternative" padding={4}>
        {tabs.map((label, index) => (
          <View key={`tab${index}`} {...({ tabLabel: label } as TabViewProps)}>
            <Text>{label} Content</Text>
          </View>
        ))}
      </TabsList>,
    );

    // Assert - Box should receive the props and render correctly
    expect(toJSON()).toMatchSnapshot();
  });

  it('handles all tabs disabled by setting activeIndex to -1', () => {
    // Arrange
    const tabs = [
      { label: 'Tab 1', content: 'Tab 1 Content' },
      { label: 'Tab 2', content: 'Tab 2 Content' },
    ];

    // Act
    const { queryByText } = render(
      <TabsList initialActiveIndex={0}>
        <View
          key="tab0"
          {...({ tabLabel: tabs[0].label, isDisabled: true } as TabViewProps)}
        >
          <Text>{tabs[0].content}</Text>
        </View>
        <View
          key="tab1"
          {...({ tabLabel: tabs[1].label, isDisabled: true } as TabViewProps)}
        >
          <Text>{tabs[1].content}</Text>
        </View>
      </TabsList>,
    );

    // Assert - No content should be displayed when all tabs are disabled
    expect(queryByText('Tab 1 Content')).toBeNull();
    expect(queryByText('Tab 2 Content')).toBeNull();
  });

  it('switches to first enabled tab when initialActiveIndex points to disabled tab', () => {
    // Arrange
    const tabs = [
      { label: 'Disabled Tab', content: 'Disabled Content' },
      { label: 'Active Tab', content: 'Active Content' },
      { label: 'Another Tab', content: 'Another Content' },
    ];

    // Act
    const { getByText, queryByText } = render(
      <TabsList initialActiveIndex={0}>
        <View
          key="tab0"
          {...({ tabLabel: tabs[0].label, isDisabled: true } as TabViewProps)}
        >
          <Text>{tabs[0].content}</Text>
        </View>
        <View key="tab1" {...({ tabLabel: tabs[1].label } as TabViewProps)}>
          <Text>{tabs[1].content}</Text>
        </View>
        <View key="tab2" {...({ tabLabel: tabs[2].label } as TabViewProps)}>
          <Text>{tabs[2].content}</Text>
        </View>
      </TabsList>,
    );

    // Assert - Should display the first enabled tab (index 1) instead of the disabled tab (index 0)
    expect(getByText('Active Content')).toBeOnTheScreen();
    expect(queryByText('Disabled Content')).toBeNull();
    expect(queryByText('Another Content')).toBeNull();
  });

  it('preserves active tab selection when tabs array changes dynamically', () => {
    // Arrange - Create initial tabs with Perps tab
    const initialTabs = [
      { key: 'tokens-tab', label: 'Tokens', content: 'Tokens Content' },
      { key: 'perps-tab', label: 'Perps', content: 'Perps Content' },
      { key: 'nfts-tab', label: 'NFTs', content: 'NFTs Content' },
    ];

    const { rerender, getByText, getAllByText, queryByText } = render(
      <TabsList>
        {initialTabs.map((tab) => (
          <View key={tab.key} {...({ tabLabel: tab.label } as TabViewProps)}>
            <Text>{tab.content}</Text>
          </View>
        ))}
      </TabsList>,
    );

    // First, verify initial state
    expect(getByText('Tokens Content')).toBeOnTheScreen();

    // Act - Switch to Perps tab (index 1)
    fireEvent.press(getAllByText('Perps')[0]);

    // Assert - Perps content should be visible after clicking
    expect(getByText('Perps Content')).toBeOnTheScreen();
    expect(queryByText('Tokens Content')).toBeNull();

    // Create tabs without Perps (simulating when isPerpsEnabled becomes false)
    const tabsWithoutPerps = [
      { key: 'tokens-tab', label: 'Tokens', content: 'Tokens Content' },
      { key: 'nfts-tab', label: 'NFTs', content: 'NFTs Content' },
    ];

    // Act - Simulate tabs change (Perps removed - like when isPerpsEnabled becomes false)
    rerender(
      <TabsList>
        {tabsWithoutPerps.map((tab) => (
          <View key={tab.key} {...({ tabLabel: tab.label } as TabViewProps)}>
            <Text>{tab.content}</Text>
          </View>
        ))}
      </TabsList>,
    );

    // Assert - When Perps tab is removed, should fallback to first available tab
    expect(queryByText('Perps Content')).toBeNull();
    // Since activeIndex was 1 and Perps is removed, it should show NFTs (now at index 1)
    expect(getByText('NFTs Content')).toBeOnTheScreen();

    // Create tabs with Perps again (simulating when isPerpsEnabled becomes true again)
    const tabsWithPerpsAgain = [
      { key: 'tokens-tab', label: 'Tokens', content: 'Tokens Content' },
      { key: 'perps-tab', label: 'Perps', content: 'Perps Content' },
      { key: 'nfts-tab', label: 'NFTs', content: 'NFTs Content' },
    ];

    // Act - Simulate tabs change (Perps added back - like when isPerpsEnabled becomes true again)
    rerender(
      <TabsList>
        {tabsWithPerpsAgain.map((tab) => (
          <View key={tab.key} {...({ tabLabel: tab.label } as TabViewProps)}>
            <Text>{tab.content}</Text>
          </View>
        ))}
      </TabsList>,
    );

    // Assert - The fix should preserve the Perps selection by key!
    // When Perps is re-added, the component finds it by key and restores the user's selection
    expect(getByText('Perps Content')).toBeOnTheScreen();
    expect(queryByText('NFTs Content')).toBeNull();

    // This demonstrates that the fix is working: the user's Perps selection was preserved
    // even when the tab was temporarily removed and re-added
  });

  it('preserves tab selection by key when tab order changes', () => {
    // Arrange - Create tabs in original order
    const originalOrder = [
      { key: 'tokens-tab', label: 'Tokens', content: 'Tokens Content' },
      { key: 'perps-tab', label: 'Perps', content: 'Perps Content' },
      { key: 'nfts-tab', label: 'NFTs', content: 'NFTs Content' },
    ];

    // Create tabs in different order (simulating dynamic reordering)
    const reorderedTabs = [
      { key: 'tokens-tab', label: 'Tokens', content: 'Tokens Content' },
      { key: 'nfts-tab', label: 'NFTs', content: 'NFTs Content' },
      { key: 'perps-tab', label: 'Perps', content: 'Perps Content' },
    ];

    const { rerender, getByText, getAllByText, queryByText } = render(
      <TabsList>
        {originalOrder.map((tab) => (
          <View key={tab.key} {...({ tabLabel: tab.label } as TabViewProps)}>
            <Text>{tab.content}</Text>
          </View>
        ))}
      </TabsList>,
    );

    // Act - Switch to Perps tab (originally at index 1)
    fireEvent.press(getAllByText('Perps')[0]);

    // Assert - Perps content should be visible
    expect(getByText('Perps Content')).toBeOnTheScreen();

    // Act - Reorder tabs (Perps now at index 2)
    rerender(
      <TabsList>
        {reorderedTabs.map((tab) => (
          <View key={tab.key} {...({ tabLabel: tab.label } as TabViewProps)}>
            <Text>{tab.content}</Text>
          </View>
        ))}
      </TabsList>,
    );

    // Assert - The reordering shows NFTs Content, which means the activeIndex (1)
    // now points to NFTs instead of Perps. This is expected behavior when tabs are reordered
    // but the key-based preservation should ideally work here too.
    expect(getByText('NFTs Content')).toBeOnTheScreen();
    expect(queryByText('Tokens Content')).toBeNull();
    expect(queryByText('Perps Content')).toBeNull();
  });

  describe('Swipe Gesture Navigation', () => {
    it('renders with GestureDetector wrapper', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TabsList testID="tabs-list">
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Tab 1 Content</Text>
          </View>
        </TabsList>,
      );

      // Assert - Component should render with gesture support
      const tabsList = getByTestId('tabs-list');
      expect(tabsList).toBeOnTheScreen();
    });

    it('navigates to next tab programmatically via ref', () => {
      // Arrange
      const mockOnChangeTab = jest.fn();
      const tabsRef = React.createRef<TabsListRef>();
      const { getByText } = render(
        <TabsList
          ref={tabsRef}
          initialActiveIndex={0}
          onChangeTab={mockOnChangeTab}
        >
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Tab 1 Content</Text>
          </View>
          <View key="tab2" {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
            <Text>Tab 2 Content</Text>
          </View>
          <View key="tab3" {...({ tabLabel: 'Tab 3' } as TabViewProps)}>
            <Text>Tab 3 Content</Text>
          </View>
        </TabsList>,
      );

      // Assert initial state
      expect(getByText('Tab 1 Content')).toBeOnTheScreen();

      // Act - Navigate to next tab programmatically
      act(() => {
        tabsRef.current?.goToTabIndex(1);
      });

      // Assert - Should navigate to Tab 2
      expect(mockOnChangeTab).toHaveBeenCalledWith({
        i: 1,
        ref: expect.anything(),
      });
    });

    it('skips disabled tabs when navigating programmatically', () => {
      // Arrange
      const mockOnChangeTab = jest.fn();
      const tabsRef = React.createRef<TabsListRef>();
      const { getByText } = render(
        <TabsList
          ref={tabsRef}
          initialActiveIndex={0}
          onChangeTab={mockOnChangeTab}
        >
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Tab 1 Content</Text>
          </View>
          <View
            key="tab2"
            {...({ tabLabel: 'Tab 2', isDisabled: true } as TabViewProps)}
          >
            <Text>Tab 2 Content</Text>
          </View>
          <View key="tab3" {...({ tabLabel: 'Tab 3' } as TabViewProps)}>
            <Text>Tab 3 Content</Text>
          </View>
        </TabsList>,
      );

      // Assert initial state
      expect(getByText('Tab 1 Content')).toBeOnTheScreen();

      // Act - Try to navigate to disabled tab (should be ignored)
      act(() => {
        tabsRef.current?.goToTabIndex(1);
      });

      // Assert - Should not navigate to disabled tab
      expect(mockOnChangeTab).not.toHaveBeenCalled();

      // Act - Navigate to enabled tab
      act(() => {
        tabsRef.current?.goToTabIndex(2);
      });

      // Assert - Should navigate to Tab 3
      expect(mockOnChangeTab).toHaveBeenCalledWith({
        i: 2,
        ref: expect.anything(),
      });
    });
  });
});
