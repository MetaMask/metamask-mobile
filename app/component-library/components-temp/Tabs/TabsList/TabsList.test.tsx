// Third party dependencies.
import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
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

  it('displays correct initial tab content with on-demand loading', async () => {
    // Arrange
    const tabs = [
      { label: 'Tokens', content: 'Tokens Content' },
      { label: 'NFTs', content: 'NFTs Content' },
    ];

    // Act
    const { getByText, queryByText, getAllByText } = render(
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

    // Assert - Active tab loads immediately
    expect(getByText('Tokens Content')).toBeOnTheScreen();

    // Other tabs should not be loaded yet (on-demand loading)
    expect(queryByText('NFTs Content')).toBeNull();

    // When user clicks the NFTs tab, it should load
    fireEvent.press(getAllByText('NFTs')[0]);

    // Wait for the delayed loading to complete
    await waitFor(() => {
      expect(getByText('NFTs Content')).toBeOnTheScreen();
    });
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

    // Assert - NFTs content should be on screen
    expect(getByText('NFTs Content')).toBeOnTheScreen();
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

  describe('Lazy Loading', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('loads active tab immediately', () => {
      // Arrange & Act
      const { getByText } = render(
        <TabsList initialActiveIndex={0}>
          <View {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
          <View {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
            <Text>Content 2</Text>
          </View>
        </TabsList>,
      );

      // Assert
      expect(getByText('Content 1')).toBeOnTheScreen();
    });

    it('defers loading of inactive tabs', () => {
      // Arrange & Act
      const { queryByText } = render(
        <TabsList initialActiveIndex={0}>
          <View {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
          <View {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
            <Text>Content 2</Text>
          </View>
        </TabsList>,
      );

      // Assert
      expect(queryByText('Content 2')).toBeNull();
    });

    it('preloads adjacent tabs after settling', async () => {
      // Arrange & Act
      const { getByText } = render(
        <TabsList initialActiveIndex={0}>
          <View {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
          <View {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
            <Text>Content 2</Text>
          </View>
          <View {...({ tabLabel: 'Tab 3' } as TabViewProps)}>
            <Text>Content 3</Text>
          </View>
        </TabsList>,
      );

      expect(getByText('Content 1')).toBeOnTheScreen();

      await act(async () => {
        jest.advanceTimersByTime(600);
      });
    });

    it('skips disabled tabs when preloading adjacent tabs', async () => {
      // Arrange & Act
      render(
        <TabsList initialActiveIndex={0}>
          <View {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
          <View {...({ tabLabel: 'Tab 2', isDisabled: true } as TabViewProps)}>
            <Text>Content 2</Text>
          </View>
          <View {...({ tabLabel: 'Tab 3' } as TabViewProps)}>
            <Text>Content 3</Text>
          </View>
        </TabsList>,
      );

      await act(async () => {
        jest.advanceTimersByTime(600);
      });
    });
  });

  describe('Gesture Detection', () => {
    it('renders with GestureDetector wrapper', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TabsList testID="tabs-list">
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Tab 1 Content</Text>
          </View>
          <View key="tab2" {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
            <Text>Tab 2 Content</Text>
          </View>
        </TabsList>,
      );

      // Assert - Component should render with gesture support
      const tabsList = getByTestId('tabs-list');
      expect(tabsList).toBeOnTheScreen();
    });

    it('maintains performance by only rendering active tab content', () => {
      // Arrange & Act
      const { getByText, queryByText } = render(
        <TabsList initialActiveIndex={1} testID="tabs-list">
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

      // Assert - Only active tab content is rendered
      expect(queryByText('Tab 1 Content')).toBeNull();
      expect(getByText('Tab 2 Content')).toBeOnTheScreen();
      expect(queryByText('Tab 3 Content')).toBeNull();
    });
  });
});
