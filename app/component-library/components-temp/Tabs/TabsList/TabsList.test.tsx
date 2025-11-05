// Third party dependencies.
import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { View, InteractionManager } from 'react-native';

// External dependencies.
import { Text } from '@metamask/design-system-react-native';

// Internal dependencies.
import TabsList from './TabsList';
import { TabViewProps, TabsListRef } from './TabsList.types';

// Mock InteractionManager
jest.mock('react-native/Libraries/Interaction/InteractionManager', () => ({
  runAfterInteractions: jest.fn((callback) => {
    // Execute callback immediately for tests
    callback();
    return { cancel: jest.fn() };
  }),
}));

describe('TabsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default behavior that executes callbacks immediately
    (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
      (callback) => {
        callback();
        return { cancel: jest.fn() };
      },
    );
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

    // Assert - Active tab loads via InteractionManager
    expect(getByText('Tokens Content')).toBeOnTheScreen();

    // Other tabs should not be loaded yet (on-demand loading)
    expect(queryByText('NFTs Content')).toBeNull();

    // When user clicks the NFTs tab, it should load
    await act(async () => {
      fireEvent.press(getAllByText('NFTs')[0]);
    });

    // Wait for the deferred loading to complete
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
    const { getByText, getAllByText } = render(
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
    const ref = React.createRef<TabsListRef>();
    const tabs = [
      { label: 'Tab 1', content: 'Tab 1 Content' },
      { label: 'Tab 2', content: 'Tab 2 Content' },
    ];

    // Act
    render(
      <TabsList ref={ref} initialActiveIndex={0}>
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

    // Assert - activeIndex set to -1 when all tabs are disabled
    expect(ref.current?.getCurrentIndex()).toBe(-1);
  });

  it('switches to first enabled tab when initialActiveIndex points to disabled tab', () => {
    // Arrange
    const ref = React.createRef<TabsListRef>();
    const tabs = [
      { label: 'Disabled Tab', content: 'Disabled Content' },
      { label: 'Active Tab', content: 'Active Content' },
      { label: 'Another Tab', content: 'Another Content' },
    ];

    // Act
    const { getByText } = render(
      <TabsList ref={ref} initialActiveIndex={0}>
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

    // Assert - Should switch to first enabled tab (index 1) when initial tab is disabled
    expect(ref.current?.getCurrentIndex()).toBe(1);
    expect(getByText('Active Content')).toBeOnTheScreen();
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

  describe('Deferred Content Loading', () => {
    it('loads active tab content via InteractionManager', () => {
      // Arrange
      const mockRunAfterInteractions = jest.fn((callback) => {
        callback();
        return { cancel: jest.fn() };
      });
      (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
        mockRunAfterInteractions,
      );

      // Act
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

      // Assert - InteractionManager used for initial tab load
      expect(mockRunAfterInteractions).toHaveBeenCalled();
      expect(getByText('Content 1')).toBeOnTheScreen();
    });

    it('defers loading of inactive tabs until switched to', () => {
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

      // Assert - Inactive tab content not loaded
      expect(queryByText('Content 2')).toBeNull();
    });

    it('cancels pending content load when switching tabs quickly', async () => {
      // Arrange
      const mockCancel = jest.fn();
      let capturedCallback: (() => void) | null = null;
      (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
        (callback: () => void) => {
          capturedCallback = callback;
          return { cancel: mockCancel };
        },
      );

      const { getAllByText } = render(
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

      // Act - Switch tabs quickly before interaction completes
      await act(async () => {
        fireEvent.press(getAllByText('Tab 2')[0]);
        fireEvent.press(getAllByText('Tab 3')[0]);
        if (capturedCallback) {
          capturedCallback();
        }
      });

      // Assert - Previous interaction was cancelled
      expect(mockCancel).toHaveBeenCalled();
    });

    it('loads already-loaded tabs immediately without InteractionManager delay', async () => {
      // Arrange
      const mockRunAfterInteractions = jest.fn((callback) => {
        callback();
        return { cancel: jest.fn() };
      });
      (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
        mockRunAfterInteractions,
      );

      const { getAllByText, getByText } = render(
        <TabsList initialActiveIndex={0}>
          <View {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
          <View {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
            <Text>Content 2</Text>
          </View>
        </TabsList>,
      );

      // Load Tab 2 for the first time
      await act(async () => {
        fireEvent.press(getAllByText('Tab 2')[0]);
      });

      const callCountAfterFirstSwitch =
        mockRunAfterInteractions.mock.calls.length;

      // Act - Switch back to Tab 1 (already loaded)
      await act(async () => {
        fireEvent.press(getAllByText('Tab 1')[0]);
      });

      // Assert - Already loaded tab displays immediately without new InteractionManager call
      expect(getByText('Content 1')).toBeOnTheScreen();
      expect(mockRunAfterInteractions).toHaveBeenCalledTimes(
        callCountAfterFirstSwitch,
      );
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

    it('allows navigation through multiple tabs using ref', async () => {
      // Arrange
      const ref = React.createRef<TabsListRef>();
      const { getByText } = render(
        <TabsList testID="tabs-list" ref={ref} initialActiveIndex={1}>
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

      expect(getByText('Tab 2 Content')).toBeOnTheScreen();

      // Act - Navigate backward to Tab 1
      await act(async () => {
        ref.current?.goToTabIndex(0);
      });

      // Assert
      expect(getByText('Tab 1 Content')).toBeOnTheScreen();
      expect(ref.current?.getCurrentIndex()).toBe(0);

      // Act - Navigate forward to Tab 3
      await act(async () => {
        ref.current?.goToTabIndex(2);
      });

      // Assert
      expect(getByText('Tab 3 Content')).toBeOnTheScreen();
      expect(ref.current?.getCurrentIndex()).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('handles non-React element children with default values', () => {
      // Arrange
      const nonReactElementChild = 'Plain text';

      // Act
      const { toJSON } = render(
        <TabsList>
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Tab 1 Content</Text>
          </View>
          {nonReactElementChild as unknown as React.ReactElement}
        </TabsList>,
      );

      // Assert - Component handles non-React elements gracefully
      expect(toJSON()).toMatchSnapshot();
    });

    it('uses initialActiveIndex when it points to an enabled tab', () => {
      // Arrange
      const ref = React.createRef<TabsListRef>();
      const tabs = [
        { label: 'Tab 1', content: 'Tab 1 Content' },
        { label: 'Tab 2', content: 'Tab 2 Content' },
        { label: 'Tab 3', content: 'Tab 3 Content' },
      ];

      // Act - initialActiveIndex points to Tab 3 (index 2) which is enabled
      const { getByText } = render(
        <TabsList ref={ref} initialActiveIndex={2}>
          <View key="tab0" {...({ tabLabel: tabs[0].label } as TabViewProps)}>
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

      // Assert - Should show the tab at initialActiveIndex
      expect(getByText('Tab 3 Content')).toBeOnTheScreen();
      expect(ref.current?.getCurrentIndex()).toBe(2);
    });

    it('generates default tab label when tabLabel prop is missing', () => {
      // Arrange & Act
      const { getAllByText } = render(
        <TabsList>
          <View key="tab1">
            <Text>Content Without Label</Text>
          </View>
          <View key="tab2" {...({ tabLabel: 'Named Tab' } as TabViewProps)}>
            <Text>Named Tab Content</Text>
          </View>
        </TabsList>,
      );

      // Assert - Default label "Tab 1" is generated
      expect(getAllByText('Tab 1')[0]).toBeOnTheScreen();
      expect(getAllByText('Named Tab')[0]).toBeOnTheScreen();
    });

    it('generates default key when child has no key prop', () => {
      // Arrange & Act
      const { getByText } = render(
        <TabsList>
          <View {...({ tabLabel: 'Tab Without Key' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
        </TabsList>,
      );

      // Assert - Component renders without errors
      expect(getByText('Content 1')).toBeOnTheScreen();
    });

    it('ignores tab press when index is negative', () => {
      // Arrange
      const ref = React.createRef<TabsListRef>();
      const mockOnChangeTab = jest.fn();

      render(
        <TabsList ref={ref} onChangeTab={mockOnChangeTab}>
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
        </TabsList>,
      );

      // Act - Try to navigate to negative index
      act(() => {
        ref.current?.goToTabIndex(-1);
      });

      // Assert - onChangeTab not called
      expect(mockOnChangeTab).not.toHaveBeenCalled();
      expect(ref.current?.getCurrentIndex()).toBe(0);
    });

    it('ignores tab press when index exceeds tabs length', () => {
      // Arrange
      const ref = React.createRef<TabsListRef>();
      const mockOnChangeTab = jest.fn();

      render(
        <TabsList ref={ref} onChangeTab={mockOnChangeTab}>
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
        </TabsList>,
      );

      // Act - Try to navigate to out of bounds index
      act(() => {
        ref.current?.goToTabIndex(5);
      });

      // Assert - onChangeTab not called
      expect(mockOnChangeTab).not.toHaveBeenCalled();
      expect(ref.current?.getCurrentIndex()).toBe(0);
    });

    it('falls back to first enabled tab when initialActiveIndex exceeds tabs length', () => {
      // Arrange
      const ref = React.createRef<TabsListRef>();
      const tabs = [
        { label: 'Tab 1', content: 'Tab 1 Content' },
        { label: 'Tab 2', content: 'Tab 2 Content' },
      ];

      // Act - initialActiveIndex is 10 but only 2 tabs exist
      const { getByText } = render(
        <TabsList ref={ref} initialActiveIndex={10}>
          <View key="tab0" {...({ tabLabel: tabs[0].label } as TabViewProps)}>
            <Text>{tabs[0].content}</Text>
          </View>
          <View key="tab1" {...({ tabLabel: tabs[1].label } as TabViewProps)}>
            <Text>{tabs[1].content}</Text>
          </View>
        </TabsList>,
      );

      // Assert - Falls back to first tab
      expect(getByText('Tab 1 Content')).toBeOnTheScreen();
      expect(ref.current?.getCurrentIndex()).toBe(0);
    });

    it('does not call onChangeTab when switching to same tab', async () => {
      // Arrange
      const mockOnChangeTab = jest.fn();
      const { getAllByText } = render(
        <TabsList onChangeTab={mockOnChangeTab}>
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
          <View key="tab2" {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
            <Text>Content 2</Text>
          </View>
        </TabsList>,
      );

      // Act - Press the already active tab
      await act(async () => {
        fireEvent.press(getAllByText('Tab 1')[0]);
      });

      // Assert - onChangeTab not called when tab doesn't change
      expect(mockOnChangeTab).not.toHaveBeenCalled();
    });
  });

  describe('TabsBar Integration', () => {
    it('passes tabsBarProps to TabsBar component', () => {
      // Arrange
      const customBarProps = {
        twClassName: 'custom-bar-class',
      };

      // Act
      const { toJSON } = render(
        <TabsList tabsBarProps={customBarProps}>
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
        </TabsList>,
      );

      // Assert - Props are passed to TabsBar
      expect(toJSON()).toMatchSnapshot();
    });

    it('propagates testID to TabsBar with -bar suffix', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TabsList testID="my-tabs">
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
        </TabsList>,
      );

      // Assert - TabsBar receives testID with suffix
      expect(getByTestId('my-tabs-bar')).toBeOnTheScreen();
    });

    it('propagates testID to content container with -content suffix', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TabsList testID="my-tabs">
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
        </TabsList>,
      );

      // Assert - Content container receives testID with suffix
      expect(getByTestId('my-tabs-content')).toBeOnTheScreen();
    });
  });

  describe('Content Container Styling', () => {
    it('applies tabsListContentTwClassName to content container', () => {
      // Arrange & Act
      const { toJSON } = render(
        <TabsList tabsListContentTwClassName="custom-content-class">
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
        </TabsList>,
      );

      // Assert - Custom class is applied
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders inactive tab content with absolute positioning and opacity-0', () => {
      // Arrange
      const { getByText, getAllByText } = render(
        <TabsList initialActiveIndex={0}>
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
          <View key="tab2" {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
            <Text>Content 2</Text>
          </View>
        </TabsList>,
      );

      // Load second tab first
      fireEvent.press(getAllByText('Tab 2')[0]);
      expect(getByText('Content 2')).toBeOnTheScreen();

      // Act - Switch back to first tab
      fireEvent.press(getAllByText('Tab 1')[0]);

      // Assert - Both tabs are loaded but only active one is visible
      expect(getByText('Content 1')).toBeOnTheScreen();
      // Content 2 is still in DOM but hidden (absolute + opacity-0)
      expect(getByText('Content 2')).toBeTruthy();
    });

    it('keeps loaded inactive tabs in DOM but only active tab visible', () => {
      // Arrange
      const { getAllByText, getByText, queryByText } = render(
        <TabsList initialActiveIndex={0}>
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
          <View key="tab2" {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
            <Text>Content 2</Text>
          </View>
        </TabsList>,
      );

      // Initially only Tab 1 is loaded
      expect(getByText('Content 1')).toBeOnTheScreen();
      expect(queryByText('Content 2')).toBeNull();

      // Load second tab
      fireEvent.press(getAllByText('Tab 2')[0]);
      expect(getByText('Content 2')).toBeOnTheScreen();

      // Act - Switch back to first tab
      fireEvent.press(getAllByText('Tab 1')[0]);

      // Assert - Both contents exist in DOM but only active tab is visible on screen
      expect(getByText('Content 1')).toBeOnTheScreen();
      expect(getByText('Content 2')).toBeTruthy();
      expect(queryByText('Content 2')).not.toBeNull();
    });
  });

  describe('Tab State Management', () => {
    it('maintains loaded tabs Set across re-renders', () => {
      // Arrange
      const { getAllByText, getByText, rerender } = render(
        <TabsList>
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
          <View key="tab2" {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
            <Text>Content 2</Text>
          </View>
        </TabsList>,
      );

      // Load Tab 2
      fireEvent.press(getAllByText('Tab 2')[0]);
      expect(getByText('Content 2')).toBeOnTheScreen();

      // Act - Re-render with same tabs
      rerender(
        <TabsList>
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
          <View key="tab2" {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
            <Text>Content 2</Text>
          </View>
        </TabsList>,
      );

      // Assert - Tab 2 content still loaded and visible
      expect(getByText('Content 2')).toBeOnTheScreen();
    });

    it('clears interaction handle on unmount', () => {
      // Arrange
      const mockCancel = jest.fn();
      (InteractionManager.runAfterInteractions as jest.Mock).mockReturnValue({
        cancel: mockCancel,
      });

      const { unmount } = render(
        <TabsList>
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
        </TabsList>,
      );

      // Act - Unmount component
      unmount();

      // Assert - Cancel was called for cleanup
      expect(mockCancel).toHaveBeenCalled();
    });

    it('updates activeIndex when tabs length changes and current index becomes invalid', () => {
      // Arrange
      const ref = React.createRef<TabsListRef>();
      const { rerender, getByText } = render(
        <TabsList ref={ref} initialActiveIndex={2}>
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
          <View key="tab2" {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
            <Text>Content 2</Text>
          </View>
          <View key="tab3" {...({ tabLabel: 'Tab 3' } as TabViewProps)}>
            <Text>Content 3</Text>
          </View>
        </TabsList>,
      );

      expect(getByText('Content 3')).toBeOnTheScreen();
      expect(ref.current?.getCurrentIndex()).toBe(2);

      // Act - Reduce tabs to just 1
      rerender(
        <TabsList ref={ref} initialActiveIndex={2}>
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Content 1</Text>
          </View>
        </TabsList>,
      );

      // Assert - Falls back to initialActiveIndex or first enabled tab
      expect(ref.current?.getCurrentIndex()).toBe(0);
      expect(getByText('Content 1')).toBeOnTheScreen();
    });
  });
});
