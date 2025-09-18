// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
// eslint-disable-next-line import/no-extraneous-dependencies
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';

// External dependencies.
import TextComponent from '../../components/Texts/Text';

// Internal dependencies.
import TabBar from './TabBar';

// Mock @tommasini/react-native-scrollable-tab-view
jest.mock('@tommasini/react-native-scrollable-tab-view', () => ({
  __esModule: true,
  default: ({
    children,
    renderTabBar,
    initialPage = 0,
  }: {
    children: React.ReactNode;
    renderTabBar: (props: Record<string, unknown>) => React.ReactNode;
    initialPage?: number;
  }) => {
    const ReactLib = jest.requireActual('react');
    const { View: RNView, Animated } = jest.requireActual('react-native');

    // Extract tab labels from children
    const tabs = ReactLib.Children.toArray(children).map(
      (child: React.ReactNode, index: number) => {
        if (ReactLib.isValidElement(child)) {
          return (child as React.ReactElement).props.tabLabel || `Tab ${index}`;
        }
        return `Tab ${index}`;
      },
    );

    // Create mock props for DefaultTabBar
    const mockTabBarProps = {
      tabs,
      activeTab: initialPage,
      goToPage: jest.fn(),
      scrollValue: new Animated.Value(0),
      containerWidth: 300,
    };

    return ReactLib.createElement(
      RNView,
      { testID: 'scrollable-tab-view' },
      renderTabBar?.(mockTabBarProps),
      children,
    );
  },
}));

interface TabViewProps {
  tabLabel: string;
}

describe('TabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with ScrollableTabView', () => {
    // Arrange
    const tabs = ['Tab 1', 'Tab 2'];

    // Act
    const { toJSON } = render(
      <ScrollableTabView
        renderTabBar={(props) => <TabBar {...props} />}
        initialPage={0}
      >
        {tabs.map((label, index) => (
          <View key={`tab${index}`} {...({ tabLabel: label } as TabViewProps)}>
            <TextComponent>{label} Content</TextComponent>
          </View>
        ))}
      </ScrollableTabView>,
    );

    // Assert
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with custom style using ScrollableTabView', () => {
    // Arrange
    const tabs = ['Tab 1', 'Tab 2'];
    const customStyle = { backgroundColor: 'red' };

    // Act
    const { toJSON } = render(
      <ScrollableTabView
        renderTabBar={(props) => <TabBar {...props} style={customStyle} />}
        initialPage={0}
      >
        {tabs.map((label, index) => (
          <View key={`tab${index}`} {...({ tabLabel: label } as TabViewProps)}>
            <TextComponent>{label} Content</TextComponent>
          </View>
        ))}
      </ScrollableTabView>,
    );

    // Assert
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays tab labels when used with ScrollableTabView', () => {
    // Arrange
    const tabLabels = ['Tokens', 'NFTs', 'DeFi'];

    // Act
    const { getByText } = render(
      <ScrollableTabView
        renderTabBar={(props) => <TabBar {...props} />}
        initialPage={0}
      >
        {tabLabels.map((label, index) => (
          <View key={`tab${index}`} {...({ tabLabel: label } as TabViewProps)}>
            <TextComponent>{label} Content</TextComponent>
          </View>
        ))}
      </ScrollableTabView>,
    );

    // Assert
    tabLabels.forEach((label) => {
      expect(getByText(label)).toBeOnTheScreen();
    });
  });

  it('displays tab content when used with ScrollableTabView', () => {
    // Arrange
    const tabData = [
      { label: 'Tab 1', content: 'First tab content' },
      { label: 'Tab 2', content: 'Second tab content' },
    ];

    // Act
    const { getByText } = render(
      <ScrollableTabView
        renderTabBar={(props) => <TabBar {...props} />}
        initialPage={0}
      >
        {tabData.map((tab, index) => (
          <View
            key={`tab${index}`}
            {...({ tabLabel: tab.label } as TabViewProps)}
          >
            <TextComponent>{tab.content}</TextComponent>
          </View>
        ))}
      </ScrollableTabView>,
    );

    // Assert
    expect(getByText('First tab content')).toBeOnTheScreen();
    expect(getByText('Second tab content')).toBeOnTheScreen();
  });

  it('handles tab change events when used with ScrollableTabView', () => {
    // Arrange
    const mockOnChangeTab = jest.fn();

    // Act
    render(
      <ScrollableTabView
        renderTabBar={(props) => <TabBar {...props} />}
        onChangeTab={mockOnChangeTab}
        initialPage={0}
      >
        <View key="tab1" {...({ tabLabel: 'Tab 1' } as TabViewProps)}>
          <TextComponent>Tab 1 Content</TextComponent>
        </View>
        <View key="tab2" {...({ tabLabel: 'Tab 2' } as TabViewProps)}>
          <TextComponent>Tab 2 Content</TextComponent>
        </View>
      </ScrollableTabView>,
    );

    // Assert - Component renders without errors and can accept onChangeTab prop
    expect(mockOnChangeTab).toHaveBeenCalledTimes(0); // Initially not called
  });

  it('renders with multiple tabs using ScrollableTabView', () => {
    // Arrange
    const multipleTabLabels = ['Tab 1', 'Tab 2', 'Tab 3', 'Tab 4', 'Tab 5'];

    // Act
    const { getByText } = render(
      <ScrollableTabView
        renderTabBar={(props) => <TabBar {...props} />}
        initialPage={0}
      >
        {multipleTabLabels.map((label, index) => (
          <View key={`tab${index}`} {...({ tabLabel: label } as TabViewProps)}>
            <TextComponent>{label} Content</TextComponent>
          </View>
        ))}
      </ScrollableTabView>,
    );

    // Assert
    multipleTabLabels.forEach((label) => {
      expect(getByText(label)).toBeOnTheScreen();
    });
  });

  it('accepts and passes through additional props with ScrollableTabView', () => {
    // Arrange
    const tabs = ['Tab 1', 'Tab 2'];
    const additionalProps = {
      backgroundColor: 'blue',
      activeTextColor: 'white',
      inactiveTextColor: 'gray',
    };

    // Act
    const { toJSON } = render(
      <ScrollableTabView
        renderTabBar={(props) => <TabBar {...props} {...additionalProps} />}
        initialPage={0}
      >
        {tabs.map((label, index) => (
          <View key={`tab${index}`} {...({ tabLabel: label } as TabViewProps)}>
            <TextComponent>{label} Content</TextComponent>
          </View>
        ))}
      </ScrollableTabView>,
    );

    // Assert
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with initial page set to second tab using ScrollableTabView', () => {
    // Arrange
    const tabs = ['First', 'Second', 'Third'];

    // Act
    const { getByText } = render(
      <ScrollableTabView
        renderTabBar={(props) => <TabBar {...props} />}
        initialPage={1}
      >
        {tabs.map((label, index) => (
          <View key={`tab${index}`} {...({ tabLabel: label } as TabViewProps)}>
            <TextComponent>{label} Tab</TextComponent>
          </View>
        ))}
      </ScrollableTabView>,
    );

    // Assert
    tabs.forEach((label) => {
      expect(getByText(label)).toBeOnTheScreen();
    });
  });
});
