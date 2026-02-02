/* eslint-disable import/no-commonjs, react/prop-types */
/**
 * Mock for @tommasini/react-native-scrollable-tab-view
 * Used in tests to avoid transforming the package (uses ES modules).
 */
const React = require('react');
const { View } = require('react-native');

const ScrollableTabView = ({
  children,
  renderTabBar,
  initialPage = 0,
  onChangeTab,
  ...props
}) => {
  React.useEffect(() => {
    if (onChangeTab) {
      onChangeTab({ i: initialPage, ref: { props: { tabLabel: '' } } });
    }
  }, [onChangeTab, initialPage]);

  const mockTabBarProps = {
    tabs: [],
    activeTab: initialPage,
    goToPage: jest.fn(),
    scrollValue: { _value: 0 },
    containerWidth: 300,
  };

  return React.createElement(
    View,
    { testID: 'scrollable-tab-view', ...props },
    renderTabBar?.(mockTabBarProps),
    children,
  );
};

module.exports = {
  __esModule: true,
  default: ScrollableTabView,
};
