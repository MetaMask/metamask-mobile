// Third party dependencies.
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { View, InteractionManager } from 'react-native';

// External dependencies.
import { Text } from '@metamask/design-system-react-native';

// Internal dependencies.
import TabsIconList from './TabsIconList';
import { TabsIconViewProps, TabsIconListRef } from './TabsIconList.types';
import { IconName } from '../../../components/Icons/Icon/Icon.types';

jest.mock('react-native/Libraries/Interaction/InteractionManager', () => {
  const interactionManager = {
    runAfterInteractions: jest.fn((callback) => {
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

const tabViewProps = (label: string, icon: IconName): TabsIconViewProps => ({
  tabLabel: label,
  tabIcon: icon,
});

describe('TabsIconList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
      (callback) => {
        callback();
        return { cancel: jest.fn() };
      },
    );
  });

  describe('Initial Rendering', () => {
    it('renders the first tab as active by default', () => {
      const { getByText, queryByText } = render(
        <TabsIconList>
          <View
            key="t1"
            {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
          >
            <Text>Portfolio Content</Text>
          </View>
          <View
            key="t2"
            {...(tabViewProps('Perpetuals', IconName.Candlestick) as object)}
          >
            <Text>Perpetuals Content</Text>
          </View>
        </TabsIconList>,
      );
      expect(getByText('Portfolio Content')).toBeOnTheScreen();
      expect(queryByText('Perpetuals Content')).toBeNull();
    });

    it('renders with initialActiveIndex pointing to a non-zero tab', () => {
      const { getByText } = render(
        <TabsIconList initialActiveIndex={1}>
          <View
            key="t1"
            {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
          >
            <Text>Content 1</Text>
          </View>
          <View
            key="t2"
            {...(tabViewProps('Perpetuals', IconName.Candlestick) as object)}
          >
            <Text>Content 2</Text>
          </View>
        </TabsIconList>,
      );
      expect(getByText('Content 2')).toBeOnTheScreen();
    });

    it('falls back to first enabled tab when initialActiveIndex points to a disabled tab', () => {
      const ref = React.createRef<TabsIconListRef>();
      const { getByText } = render(
        <TabsIconList ref={ref} initialActiveIndex={0}>
          <View
            key="t1"
            {...({
              ...tabViewProps('Portfolio', IconName.PieChart),
              isDisabled: true,
            } as object)}
          >
            <Text>Content 1</Text>
          </View>
          <View
            key="t2"
            {...(tabViewProps('Perpetuals', IconName.Candlestick) as object)}
          >
            <Text>Content 2</Text>
          </View>
        </TabsIconList>,
      );
      expect(ref.current?.getCurrentIndex()).toBe(1);
      expect(getByText('Content 2')).toBeOnTheScreen();
    });

    it('sets activeIndex to -1 when all tabs are disabled', () => {
      const ref = React.createRef<TabsIconListRef>();
      render(
        <TabsIconList ref={ref}>
          <View
            key="t1"
            {...({
              ...tabViewProps('Portfolio', IconName.PieChart),
              isDisabled: true,
            } as object)}
          >
            <Text>Content 1</Text>
          </View>
          <View
            key="t2"
            {...({
              ...tabViewProps('Perpetuals', IconName.Candlestick),
              isDisabled: true,
            } as object)}
          >
            <Text>Content 2</Text>
          </View>
        </TabsIconList>,
      );
      expect(ref.current?.getCurrentIndex()).toBe(-1);
    });

    it('applies tabsListContentTwClassName to the content container', () => {
      const { getByTestId } = render(
        <TabsIconList testID="list" tabsListContentTwClassName="bg-red-500">
          <View
            key="t1"
            {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
          >
            <Text>Content 1</Text>
          </View>
        </TabsIconList>,
      );
      expect(getByTestId('list-content')).toBeOnTheScreen();
    });
  });

  describe('Tab Switching', () => {
    it('switches tab content when a tab is pressed', async () => {
      const { getByText, getAllByText } = render(
        <TabsIconList>
          <View
            key="t1"
            {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
          >
            <Text>Portfolio Content</Text>
          </View>
          <View
            key="t2"
            {...(tabViewProps('Perpetuals', IconName.Candlestick) as object)}
          >
            <Text>Perpetuals Content</Text>
          </View>
        </TabsIconList>,
      );
      await act(async () => {
        fireEvent.press(getAllByText('Perpetuals')[0]);
      });
      expect(getByText('Perpetuals Content')).toBeOnTheScreen();
    });

    it('calls onChangeTab when active tab changes', async () => {
      const mockOnChangeTab = jest.fn();
      const { getAllByText } = render(
        <TabsIconList onChangeTab={mockOnChangeTab}>
          <View
            key="t1"
            {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
          >
            <Text>Content 1</Text>
          </View>
          <View
            key="t2"
            {...(tabViewProps('Perpetuals', IconName.Candlestick) as object)}
          >
            <Text>Content 2</Text>
          </View>
        </TabsIconList>,
      );
      await act(async () => {
        fireEvent.press(getAllByText('Perpetuals')[0]);
      });
      expect(mockOnChangeTab).toHaveBeenCalledWith({
        i: 1,
        ref: expect.any(Object),
      });
    });

    it('does not call onChangeTab when the same tab is pressed again', async () => {
      const mockOnChangeTab = jest.fn();
      const { getAllByText } = render(
        <TabsIconList onChangeTab={mockOnChangeTab}>
          <View
            key="t1"
            {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
          >
            <Text>Content 1</Text>
          </View>
          <View
            key="t2"
            {...(tabViewProps('Perpetuals', IconName.Candlestick) as object)}
          >
            <Text>Content 2</Text>
          </View>
        </TabsIconList>,
      );
      // First press — should fire
      await act(async () => {
        fireEvent.press(getAllByText('Perpetuals')[0]);
      });
      expect(mockOnChangeTab).toHaveBeenCalledTimes(1);
      // Second press on the already-active tab — should NOT fire
      await act(async () => {
        fireEvent.press(getAllByText('Perpetuals')[0]);
      });
      expect(mockOnChangeTab).toHaveBeenCalledTimes(1);
    });

    it('does not switch to a disabled tab', () => {
      const mockOnChangeTab = jest.fn();
      const { getAllByText, getByText } = render(
        <TabsIconList onChangeTab={mockOnChangeTab}>
          <View
            key="t1"
            {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
          >
            <Text>Content 1</Text>
          </View>
          <View
            key="t2"
            {...({
              ...tabViewProps('Perpetuals', IconName.Candlestick),
              isDisabled: true,
            } as object)}
          >
            <Text>Content 2</Text>
          </View>
        </TabsIconList>,
      );
      fireEvent.press(getAllByText('Perpetuals')[0]);
      expect(mockOnChangeTab).not.toHaveBeenCalled();
      expect(getByText('Content 1')).toBeOnTheScreen();
    });
  });

  describe('Ref API', () => {
    it('exposes goToTabIndex and getCurrentIndex', async () => {
      const ref = React.createRef<TabsIconListRef>();
      const { getByText } = render(
        <TabsIconList ref={ref}>
          <View
            key="t1"
            {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
          >
            <Text>Content 1</Text>
          </View>
          <View
            key="t2"
            {...(tabViewProps('Perpetuals', IconName.Candlestick) as object)}
          >
            <Text>Content 2</Text>
          </View>
          <View
            key="t3"
            {...(tabViewProps('Predictions', IconName.Predictions) as object)}
          >
            <Text>Content 3</Text>
          </View>
        </TabsIconList>,
      );
      await act(async () => {
        ref.current?.goToTabIndex(2);
      });
      expect(getByText('Content 3')).toBeOnTheScreen();
      expect(ref.current?.getCurrentIndex()).toBe(2);
    });

    it('goToTabIndex does not switch to a disabled tab', async () => {
      const ref = React.createRef<TabsIconListRef>();
      const { getByText } = render(
        <TabsIconList ref={ref} initialActiveIndex={0}>
          <View
            key="t1"
            {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
          >
            <Text>Content 1</Text>
          </View>
          <View
            key="t2"
            {...({
              ...tabViewProps('Perpetuals', IconName.Candlestick),
              isDisabled: true,
            } as object)}
          >
            <Text>Content 2</Text>
          </View>
        </TabsIconList>,
      );
      await act(async () => {
        ref.current?.goToTabIndex(1);
      });
      expect(getByText('Content 1')).toBeOnTheScreen();
      expect(ref.current?.getCurrentIndex()).toBe(0);
    });
  });

  describe('keepMounted', () => {
    it('does not trigger a new InteractionManager load when switching back to a keepMounted tab', async () => {
      const mockRunAfter = InteractionManager.runAfterInteractions as jest.Mock;
      const { getAllByText } = render(
        <TabsIconList>
          <View
            key="t1"
            {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
          >
            <Text>Content 1</Text>
          </View>
          <View
            key="t2"
            {...(tabViewProps('Perpetuals', IconName.Candlestick) as object)}
          >
            <Text>Content 2</Text>
          </View>
        </TabsIconList>,
      );
      // Load tab 2
      await act(async () => {
        fireEvent.press(getAllByText('Perpetuals')[0]);
      });
      // Switch back to tab 1
      await act(async () => {
        fireEvent.press(getAllByText('Portfolio')[0]);
      });
      const countAfterRoundTrip = mockRunAfter.mock.calls.length;
      // Switch to tab 2 again — keepMounted=true means no new load needed
      await act(async () => {
        fireEvent.press(getAllByText('Perpetuals')[0]);
      });
      expect(mockRunAfter).toHaveBeenCalledTimes(countAfterRoundTrip);
    });

    it('unmounts inactive tab content when keepMounted is false', async () => {
      const { getAllByText, queryByText } = render(
        <TabsIconList>
          <View
            key="t1"
            {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
          >
            <Text>Content 1</Text>
          </View>
          <View
            key="t2"
            {...({
              ...tabViewProps('Perpetuals', IconName.Candlestick),
              keepMounted: false,
            } as object)}
          >
            <Text>Content 2</Text>
          </View>
        </TabsIconList>,
      );
      await act(async () => {
        fireEvent.press(getAllByText('Perpetuals')[0]);
      });
      await act(async () => {
        fireEvent.press(getAllByText('Portfolio')[0]);
      });
      expect(queryByText('Content 2')).toBeNull();
    });
  });

  describe('Content Loading', () => {
    it('uses fallback timeout when InteractionManager callback does not run', async () => {
      jest.useFakeTimers();
      (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
        () => ({ cancel: jest.fn() }),
      );
      try {
        const { queryByText, getByText } = render(
          <TabsIconList initialActiveIndex={0}>
            <View
              key="t1"
              {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
            >
              <Text>Content 1</Text>
            </View>
          </TabsIconList>,
        );
        expect(queryByText('Content 1')).toBeNull();
        await act(async () => {
          jest.advanceTimersByTime(250);
        });
        expect(getByText('Content 1')).toBeOnTheScreen();
      } finally {
        jest.useRealTimers();
      }
    });

    it('cancels pending InteractionManager handle when switching tabs quickly', async () => {
      const mockCancel = jest.fn();
      (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
        () => ({ cancel: mockCancel }),
      );
      const { getAllByText } = render(
        <TabsIconList>
          <View
            key="t1"
            {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
          >
            <Text>Content 1</Text>
          </View>
          <View
            key="t2"
            {...(tabViewProps('Perpetuals', IconName.Candlestick) as object)}
          >
            <Text>Content 2</Text>
          </View>
        </TabsIconList>,
      );
      await act(async () => {
        fireEvent.press(getAllByText('Perpetuals')[0]);
      });
      expect(mockCancel).toHaveBeenCalled();
    });

    it('does not reschedule loading for an already-loaded tab', async () => {
      const mockRunAfter = InteractionManager.runAfterInteractions as jest.Mock;
      const { getAllByText } = render(
        <TabsIconList>
          <View
            key="t1"
            {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
          >
            <Text>Content 1</Text>
          </View>
          <View
            key="t2"
            {...(tabViewProps('Perpetuals', IconName.Candlestick) as object)}
          >
            <Text>Content 2</Text>
          </View>
        </TabsIconList>,
      );
      await act(async () => {
        fireEvent.press(getAllByText('Perpetuals')[0]);
      });
      const countAfterFirstLoad = mockRunAfter.mock.calls.length;
      await act(async () => {
        fireEvent.press(getAllByText('Portfolio')[0]);
      });
      // Tab 1 already loaded — no new InteractionManager call
      expect(mockRunAfter).toHaveBeenCalledTimes(countAfterFirstLoad);
    });
  });

  describe('Dynamic Tabs', () => {
    it('preserves active tab by key when tabs array changes', async () => {
      const initialTabs = [
        {
          key: 'p-tab',
          label: 'Portfolio',
          icon: IconName.PieChart,
          content: 'Portfolio Content',
        },
        {
          key: 'perp-tab',
          label: 'Perpetuals',
          icon: IconName.Candlestick,
          content: 'Perps Content',
        },
      ];

      const { rerender, getByText, getAllByText } = render(
        <TabsIconList>
          {initialTabs.map((t) => (
            <View key={t.key} {...(tabViewProps(t.label, t.icon) as object)}>
              <Text>{t.content}</Text>
            </View>
          ))}
        </TabsIconList>,
      );
      await act(async () => {
        fireEvent.press(getAllByText('Perpetuals')[0]);
      });
      expect(getByText('Perps Content')).toBeOnTheScreen();

      // Add a new tab — Perpetuals should stay active (preserved by key)
      const updatedTabs = [
        ...initialTabs,
        {
          key: 'pred-tab',
          label: 'Predictions',
          icon: IconName.Predictions,
          content: 'Predictions Content',
        },
      ];
      rerender(
        <TabsIconList>
          {updatedTabs.map((t) => (
            <View key={t.key} {...(tabViewProps(t.label, t.icon) as object)}>
              <Text>{t.content}</Text>
            </View>
          ))}
        </TabsIconList>,
      );
      expect(getByText('Perps Content')).toBeOnTheScreen();
    });

    it('falls back to initialActiveIndex when active tab key is removed', async () => {
      const initialTabs = [
        {
          key: 'p-tab',
          label: 'Portfolio',
          icon: IconName.PieChart,
          content: 'Portfolio Content',
        },
        {
          key: 'perp-tab',
          label: 'Perpetuals',
          icon: IconName.Candlestick,
          content: 'Perps Content',
        },
      ];

      const { rerender, getByText, getAllByText, queryByText } = render(
        <TabsIconList>
          {initialTabs.map((t) => (
            <View key={t.key} {...(tabViewProps(t.label, t.icon) as object)}>
              <Text>{t.content}</Text>
            </View>
          ))}
        </TabsIconList>,
      );
      await act(async () => {
        fireEvent.press(getAllByText('Perpetuals')[0]);
      });

      // Remove Perpetuals — should fall back to Portfolio
      rerender(
        <TabsIconList>
          <View
            key="p-tab"
            {...(tabViewProps('Portfolio', IconName.PieChart) as object)}
          >
            <Text>Portfolio Content</Text>
          </View>
        </TabsIconList>,
      );
      expect(queryByText('Perps Content')).toBeNull();
      expect(getByText('Portfolio Content')).toBeOnTheScreen();
    });
  });
});
