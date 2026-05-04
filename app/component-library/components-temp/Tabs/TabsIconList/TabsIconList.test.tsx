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

  it('renders the first tab as active by default', () => {
    const { getByText, queryByText } = render(
      <TabsIconList>
        <View
          key="t1"
          {...(tabViewProps('Portfolio', IconName.Portfolio) as object)}
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

  it('switches tab content when a tab is pressed', async () => {
    const { getByText, getAllByText } = render(
      <TabsIconList>
        <View
          key="t1"
          {...(tabViewProps('Portfolio', IconName.Portfolio) as object)}
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
          {...(tabViewProps('Portfolio', IconName.Portfolio) as object)}
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

  it('does not switch to a disabled tab', () => {
    const mockOnChangeTab = jest.fn();
    const { getAllByText, getByText } = render(
      <TabsIconList onChangeTab={mockOnChangeTab}>
        <View
          key="t1"
          {...(tabViewProps('Portfolio', IconName.Portfolio) as object)}
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

  it('exposes goToTabIndex and getCurrentIndex via ref', async () => {
    const ref = React.createRef<TabsIconListRef>();
    const { getByText } = render(
      <TabsIconList ref={ref}>
        <View
          key="t1"
          {...(tabViewProps('Portfolio', IconName.Portfolio) as object)}
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
          {...(tabViewProps('Predictions', IconName.Predict) as object)}
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

  it('unmounts inactive tab content when keepMounted is false', async () => {
    const { getAllByText, queryByText } = render(
      <TabsIconList>
        <View
          key="t1"
          {...(tabViewProps('Portfolio', IconName.Portfolio) as object)}
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
    // Switch back — keepMounted=false means tab 2 should be unmounted when inactive
    await act(async () => {
      fireEvent.press(getAllByText('Portfolio')[0]);
    });
    expect(queryByText('Content 2')).toBeNull();
  });

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
            {...(tabViewProps('Portfolio', IconName.Portfolio) as object)}
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

  it('renders with initialActiveIndex pointing to a non-zero tab', () => {
    const { getByText } = render(
      <TabsIconList initialActiveIndex={1}>
        <View
          key="t1"
          {...(tabViewProps('Portfolio', IconName.Portfolio) as object)}
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
});
