import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { TabItem } from '../../../../component-library/components-temp/Tabs';
import TokenDetailsV1TabBar, {
  TOKEN_DETAILS_V1_TABS,
  TOKEN_DETAILS_V1_TAB_BAR_TEST_ID,
} from './TokenDetailsV1TabBar';

jest.mock('../../../../component-library/components-temp/Tabs', () => ({
  // The design-system TabsBar has its own coverage; a light stand-in keeps
  // this test focused on the wrapper's tab set, active tab and press mapping.
  __esModule: true,
  TabsBar: ({
    tabs,
    activeIndex,
    onTabPress,
  }: {
    tabs: TabItem[];
    activeIndex: number;
    onTabPress: (index: number) => void;
  }) => {
    const { View, Pressable, Text } = jest.requireActual('react-native');
    return (
      <View>
        {tabs.map((tab, index) => (
          <Pressable
            key={tab.key}
            testID={tab.testID}
            onPress={() => onTabPress(index)}
          >
            <Text>
              {index === activeIndex
                ? `active:${tab.key}`
                : `inactive:${tab.key}`}
            </Text>
          </Pressable>
        ))}
        {/* Simulates the design-system bar calling back with an index that
            does not map to a known tab. */}
        <Pressable testID="tab-bar-out-of-range" onPress={() => onTabPress(99)}>
          <Text>out-of-range</Text>
        </Pressable>
      </View>
    );
  },
}));

const renderTabBar = (
  activeTab: (typeof TOKEN_DETAILS_V1_TABS)[number],
  onTabPress = jest.fn(),
) =>
  render(
    <TokenDetailsV1TabBar activeTab={activeTab} onTabPress={onTabPress} />,
  );

describe('TokenDetailsV1TabBar', () => {
  it('renders the Overview, Security and Feed tabs in order', () => {
    const { getAllByText, getByTestId } = renderTabBar('overview');

    expect(getByTestId(TOKEN_DETAILS_V1_TAB_BAR_TEST_ID)).toBeTruthy();
    expect(
      getAllByText(/^(active|inactive):(overview|security|feed)$/).map(
        (node) => node.props.children,
      ),
    ).toEqual(['active:overview', 'inactive:security', 'inactive:feed']);
    expect(TOKEN_DETAILS_V1_TABS).toEqual(['overview', 'security', 'feed']);
  });

  it('marks only the active tab as active', () => {
    const { getByText, queryByText } = renderTabBar('feed');

    expect(getByText('active:feed')).toBeTruthy();
    expect(queryByText('active:overview')).toBeNull();
    expect(queryByText('active:security')).toBeNull();
  });

  it('maps the pressed design-system tab index to its tab key', () => {
    const onTabPress = jest.fn();
    const { getByTestId } = renderTabBar('overview', onTabPress);

    fireEvent.press(getByTestId('token-details-v1-tab-security'));

    expect(onTabPress).toHaveBeenCalledTimes(1);
    expect(onTabPress).toHaveBeenCalledWith('security');
  });

  it('ignores presses for unknown tab indices', () => {
    const onTabPress = jest.fn();
    const { getByTestId } = renderTabBar('overview', onTabPress);

    fireEvent.press(getByTestId('tab-bar-out-of-range'));

    expect(onTabPress).not.toHaveBeenCalled();
  });
});
