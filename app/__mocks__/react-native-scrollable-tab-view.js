/* eslint-disable import/no-commonjs */
/* eslint-disable react/prop-types */
/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';

// Mock DefaultTabBar component
const DefaultTabBar = (props) => (
  <View {...props} style={[{ height: 50 }, props.style]} />
);

// Mock ScrollableTabView component
const ScrollableTabView = ({
  children,
  renderTabBar,
  onChangeTab,
  ...props
}) => {
  // Mock the tab bar rendering
  const tabBarProps = {
    goToPage: jest.fn(),
    activeTab: 0,
    tabs: React.Children.map(children, (child, index) => ({
      key: index.toString(),
      text: child?.props?.tabLabel || `Tab ${index}`,
      ref: {
        props: {
          tabLabel: child?.props?.tabLabel || `Tab ${index}`,
        },
      },
    })),
    style: {},
  };

  return (
    <View {...props}>
      {renderTabBar && renderTabBar(tabBarProps)}
      {children}
    </View>
  );
};

// Export both the default component and the DefaultTabBar
export default ScrollableTabView;
export { DefaultTabBar };

// Also export TabBarProps type for TypeScript compatibility
export const TabBarProps = {};

// Create a mock for the DefaultTabBar module path
module.exports = ScrollableTabView;
module.exports.DefaultTabBar = DefaultTabBar;
module.exports.default = ScrollableTabView;
