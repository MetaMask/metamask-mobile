// Third party dependencies.
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { View, InteractionManager } from 'react-native';

// External dependencies.
import { Text } from '@metamask/design-system-react-native';

// Internal dependencies.
import TabsList from './TabsList';
import { TabViewProps, TabsListRef } from './TabsList.types';

// Mock InteractionManager
jest.mock('react-native/Libraries/Interaction/InteractionManager', () => {
  const interactionManager = {
    runAfterInteractions: jest.fn((callback) => {
      // Execute callback immediately for tests
      callback();
      return { cancel: jest.fn() };
    }),
  };
  return {
    __esModule: true,
    default: interactionManager,
    ...interactionManager,
  };
});

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
    const { getByText, queryByText } = render(
      <TabsList>
        {tabs.map((label, index) => (
          <View key={`tab${index}`} {...({ tabLabel: label } as TabViewProps)}>
            <Text>{label} Content</Text>
          </View>
        ))}
      </TabsList>,
    );

    // Assert - first tab is active by default; other tabs are not yet rendered
    expect(getByText('Tab 1 Content')).toBeOnTheScreen();
    expect(queryByText('Tab 2 Content')).toBeNull();
    expect(queryByText('Tab 3 Content')).toBeNull();
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

    // Assert - active tab is loaded immediately
    expect(getByText('Tokens Content')).toBeOnTheScreen();

    // Other tabs should not be loaded yet (on-demand loading)
    expect(queryByText('NFTs Content')).toBeNull();

    // When user clicks the NFTs tab, it should load
    await act(async () => {
      fireEvent.press(getAllByText('NFTs')[0]);
    });

    expect(getByText('NFTs Content')).toBeOnTheScreen();
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

  it('goToTabIndex loads target tab immediately', async () => {
    const ref = React.createRef<TabsListRef>();
    const tabs = ['Tab 1', 'Tab 2'];

    const { getByText } = render(
      <TabsList ref={ref}>
        {tabs.map((label, index) => (
          <View key={`tab${index}`} {...({ tabLabel: label } as TabViewProps)}>
            <Text>{label} Content</Text>
          </View>
        ))}
      </TabsList>,
    );

    // Act
    await act(async () => {
      ref.current?.goToTabIndex(1);
    });

    // Assert
    expect(getByText('Tab 2 Content')).toBeOnTheScreen();
  });

  it('renders initial active tab immediately', () => {
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

    // Assert
    expect(getByText('Content 1')).toBeOnTheScreen();
  });

  it('loads target tab on user press immediately', async () => {
    // Arrange
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

    // Act
    await act(async () => {
      fireEvent.press(getAllByText('Tab 2')[0]);
    });

    // Assert
    expect(getByText('Content 2')).toBeOnTheScreen();
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
    // Act — should not throw
    expect(() => render(<TabsList>{[]}</TabsList>)).not.toThrow();
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
    const { getByText } = render(
      <TabsList twClassName="bg-background-alternative" padding={4}>
        {tabs.map((label, index) => (
          <View key={`tab${index}`} {...({ tabLabel: label } as TabViewProps)}>
            <Text>{label} Content</Text>
          </View>
        ))}
      </TabsList>,
    );

    // Assert - BoxProps accepted; first tab content renders correctly
    expect(getByText('Tab 1 Content')).toBeOnTheScreen();
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

  describe('Content Loading', () => {
    it('loads active tab content via InteractionManager scheduling', () => {
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

      // Assert
      expect(getByText('Content 1')).toBeOnTheScreen();
      expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
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

    it('switches quickly while keeping loads scheduled and stable', async () => {
      // Arrange
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

      // Act
      await act(async () => {
        fireEvent.press(getAllByText('Tab 2')[0]);
        fireEvent.press(getAllByText('Tab 3')[0]);
      });

      // Assert
      expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
    });

    it('does not re-schedule loading for already-loaded tabs', async () => {
      // Arrange
      const mockRunAfterInteractions =
        InteractionManager.runAfterInteractions as jest.Mock;
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

      const callCountAfterFirstLoad =
        mockRunAfterInteractions.mock.calls.length;

      // Act - Switch back to Tab 1 (already loaded)
      await act(async () => {
        fireEvent.press(getAllByText('Tab 1')[0]);
      });

      // Assert
      expect(getByText('Content 1')).toBeOnTheScreen();
      expect(mockRunAfterInteractions).toHaveBeenCalledTimes(
        callCountAfterFirstLoad,
      );
    });

    it('stale callback from previous tab does not cancel current tab load', async () => {
      jest.useFakeTimers();

      // Capture callbacks so we can fire them manually
      let capturedCallbackA: (() => void) | null = null;

      (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
        (cb: () => void) => {
          // Capture only the first callback (Tab 1); don't auto-invoke any
          if (!capturedCallbackA) capturedCallbackA = cb;
          return { cancel: jest.fn() };
        },
      );

      try {
        const { getAllByText, getByText, queryByText } = render(
          <TabsList initialActiveIndex={0}>
            <View {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
              <Text>Content 1</Text>
            </View>
            <View {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
              <Text>Content 2</Text>
            </View>
          </TabsList>,
        );

        // Tab 1 scheduled but not yet loaded (InteractionManager not fired)
        expect(queryByText('Content 1')).toBeNull();

        // Switch to Tab 2 before Tab 1's callback fires
        await act(async () => {
          fireEvent.press(getAllByText('Tab 2')[0]);
        });

        // Now fire Tab 1's stale callback — this must NOT cancel Tab 2's fallback
        await act(async () => {
          capturedCallbackA?.();
        });

        // Tab 2 must still load via its fallback timeout
        await act(async () => {
          jest.advanceTimersByTime(250);
        });
        expect(getByText('Content 2')).toBeOnTheScreen();
      } finally {
        jest.useRealTimers();
      }
    });

    it('uses fallback timeout if InteractionManager callback does not run', async () => {
      jest.useFakeTimers();
      (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
        () => ({ cancel: jest.fn() }),
      );

      try {
        const { getAllByText, getByText, queryByText } = render(
          <TabsList initialActiveIndex={0}>
            <View {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
              <Text>Content 1</Text>
            </View>
            <View {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
              <Text>Content 2</Text>
            </View>
          </TabsList>,
        );

        expect(queryByText('Content 1')).toBeNull();
        expect(queryByText('Content 2')).toBeNull();

        await act(async () => {
          jest.advanceTimersByTime(250);
        });
        expect(getByText('Content 1')).toBeOnTheScreen();

        await act(async () => {
          fireEvent.press(getAllByText('Tab 2')[0]);
        });
        expect(queryByText('Content 2')).toBeNull();

        await act(async () => {
          jest.advanceTimersByTime(250);
        });
        expect(getByText('Content 2')).toBeOnTheScreen();
      } finally {
        jest.useRealTimers();
      }
    });

    it('does not lose scheduled load across a rerender', async () => {
      jest.useFakeTimers();
      (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
        () => ({ cancel: jest.fn() }),
      );

      try {
        const renderTabs = () => (
          <TabsList initialActiveIndex={0}>
            <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
              <Text>Content 1</Text>
            </View>
            <View key="tab2" {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
              <Text>Content 2</Text>
            </View>
          </TabsList>
        );

        const { getAllByText, getByText, queryByText, rerender } =
          render(renderTabs());

        expect(queryByText('Content 1')).toBeNull();

        await act(async () => {
          jest.advanceTimersByTime(250);
        });
        expect(getByText('Content 1')).toBeOnTheScreen();

        await act(async () => {
          fireEvent.press(getAllByText('Tab 2')[0]);
        });
        expect(queryByText('Content 2')).toBeNull();

        rerender(renderTabs());

        await act(async () => {
          jest.advanceTimersByTime(250);
        });
        expect(getByText('Content 2')).toBeOnTheScreen();
      } finally {
        jest.useRealTimers();
      }
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
      const { getByText } = render(
        <TabsList>
          <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
            <Text>Tab 1 Content</Text>
          </View>
          {nonReactElementChild as unknown as React.ReactElement}
        </TabsList>,
      );

      // Assert - valid React element child renders; non-React element is handled without crash
      expect(getByText('Tab 1 Content')).toBeOnTheScreen();
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
  });
});
