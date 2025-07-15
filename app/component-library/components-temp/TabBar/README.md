# TabBar

A TabBar component that provides a styled tab bar for use with ScrollableTabView. This component wraps the DefaultTabBar from `react-native-scrollable-tab-view` and applies consistent styling based on the app's theme.

## Props

This component extends all props from `DefaultTabBar` from `react-native-scrollable-tab-view/DefaultTabBar`.

### `style`

Optional additional styling for the tab bar.

| Type      | Required | Default |
| :-------- | :------- | :------ |
| ViewStyle | No       | -       |

## Usage

The TabBar component is designed to be used with ScrollableTabView as the `renderTabBar` prop. It automatically applies the correct styling based on the current theme.

### Basic Usage

```tsx
import React from 'react';
import { View } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import TabBar from '../TabBar';
import Text from '../../components/Texts/Text';

const MyTabView = () => (
  <ScrollableTabView renderTabBar={() => <TabBar />} initialPage={0}>
    <View key="tab1" tabLabel="Tab 1">
      <Text>Tab 1 Content</Text>
    </View>
    <View key="tab2" tabLabel="Tab 2">
      <Text>Tab 2 Content</Text>
    </View>
  </ScrollableTabView>
);
```

### With Custom Style

```tsx
import React from 'react';
import { View } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import TabBar from '../TabBar';
import Text from '../../components/Texts/Text';

const MyTabView = () => (
  <ScrollableTabView
    renderTabBar={() => <TabBar style={{ backgroundColor: 'lightblue' }} />}
    initialPage={0}
  >
    <View key="tab1" tabLabel="Tab 1">
      <Text>Tab 1 Content</Text>
    </View>
    <View key="tab2" tabLabel="Tab 2">
      <Text>Tab 2 Content</Text>
    </View>
  </ScrollableTabView>
);
```

### Handling Tab Changes

```tsx
import React, { useCallback } from 'react';
import { View } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import TabBar from '../TabBar';
import Text from '../../components/Texts/Text';

const MyTabView = () => {
  const onChangeTab = useCallback((obj) => {
    console.log('Tab changed to:', obj.i);
  }, []);

  return (
    <ScrollableTabView
      renderTabBar={() => <TabBar />}
      onChangeTab={onChangeTab}
      initialPage={0}
    >
      <View key="tab1" tabLabel="Tab 1">
        <Text>Tab 1 Content</Text>
      </View>
      <View key="tab2" tabLabel="Tab 2">
        <Text>Tab 2 Content</Text>
      </View>
    </ScrollableTabView>
  );
};
```

## Styling

The TabBar component applies the following styling based on the theme:

- **Tab Underline**: 2px height with icon default color
- **Tab Style**: 8px padding bottom and vertical, 32px horizontal padding
- **Tab Bar**: Border color matches background default, 8px margin bottom, 1px bottom border with border.muted color
- **Text Style**: Uses sBodyMD typography with BodyMD font family and 500 font weight
- **Active Text Color**: Uses text default color from theme
- **Inactive Text Color**: Uses text alternative color from theme
- **Background Color**: Uses background default color from theme

## Examples

### Wallet-style Tabs

```tsx
<ScrollableTabView renderTabBar={() => <TabBar />} initialPage={0}>
  <View key="tokens" tabLabel="Tokens">
    <TokensList />
  </View>
  <View key="nfts" tabLabel="NFTs">
    <NFTsList />
  </View>
  <View key="defi" tabLabel="DeFi">
    <DeFiPositions />
  </View>
</ScrollableTabView>
```

### Settings-style Tabs

```tsx
<ScrollableTabView renderTabBar={() => <TabBar />} initialPage={0}>
  <View key="general" tabLabel="General">
    <GeneralSettings />
  </View>
  <View key="security" tabLabel="Security">
    <SecuritySettings />
  </View>
  <View key="advanced" tabLabel="Advanced">
    <AdvancedSettings />
  </View>
</ScrollableTabView>
```

## Testing

The TabBar component includes comprehensive unit tests that cover:

- **Rendering**: Tests that the component renders correctly with default props
- **Custom Styling**: Verifies that custom styles are applied properly
- **ScrollableTabView Integration**: Tests tab label and content display when used with ScrollableTabView
- **Event Handling**: Ensures proper handling of tab change events
- **Multiple Tabs**: Tests rendering with various numbers of tabs
- **Props Passing**: Verifies that additional props are passed through to DefaultTabBar
- **Different Initial Pages**: Tests tab behavior with different starting positions

### Running Tests

```bash
yarn test:unit app/component-library/components-temp/TabBar/TabBar.test.tsx
```

### Test Coverage

The tests follow the MetaMask unit testing guidelines:

- Use AAA pattern (Arrange, Act, Assert)
- Meaningful test names that describe behavior
- Strong matchers like `toBeOnTheScreen()` instead of weak ones
- Test public behavior, not implementation details
- Isolated tests with proper mocking

## Notes

- The TabBar automatically adapts to the current theme (light/dark mode)
- All props from DefaultTabBar are supported and passed through
- The component uses the `useStyles` hook for theme-aware styling
- Tab content should be wrapped in View components with a `tabLabel` prop
- The component is designed to work seamlessly with ScrollableTabView's built-in functionality
- The 1px bottom border with `border.muted` color spans the width of the tab content area

## Related Components

- [ScrollableTabView](https://github.com/ptomasroos/react-native-scrollable-tab-view)
- [DefaultTabBar](https://github.com/ptomasroos/react-native-scrollable-tab-view/blob/master/DefaultTabBar.js)
