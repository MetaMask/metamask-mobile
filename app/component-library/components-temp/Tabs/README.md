# Tabs Component

A custom implementation to replace `react-native-scrollable-tab-view` with improved functionality and better design system integration.

## Features

- ✅ **Dynamic Heights**: Each tab content can use its own height (not limited by the tallest content)
- ✅ **Smooth Animations**: Underline animates smoothly between tabs
- ✅ **Horizontal Scrolling**: Automatically scrolls when there are many tabs
- ✅ **MetaMask Design System**: Built with `@metamask/design-system-react-native` components
- ✅ **Tailwind CSS**: Uses Tailwind classes for consistent styling
- ✅ **TypeScript**: Full TypeScript support with proper type definitions
- ✅ **Accessibility**: Proper accessibility support
- ✅ **Testing**: Comprehensive unit test coverage

## Components

### TabsList

The main container component that manages state and renders tab content.

### TabsBar

The tab bar component that handles tab display, scrolling, and underline animation.

### Tab

Individual tab component with proper styling and interaction handling.

## Usage

### Basic Example

```tsx
import React from 'react';
import { View } from 'react-native';
import { Text } from '@metamask/design-system-react-native';
import { TabsList } from '../Tabs';

const MyComponent = () => (
  <TabsList>
    <View key="tokens" tabLabel="Tokens">
      <Text>Tokens content here</Text>
    </View>
    <View key="nfts" tabLabel="NFTs">
      <Text>NFTs content here</Text>
    </View>
    <View key="defi" tabLabel="DeFi">
      <Text>DeFi content here</Text>
    </View>
  </TabsList>
);
```

### Advanced Example with Custom Tab Bar

```tsx
import { TabsList, TabsBar } from '../Tabs';

const MyComponent = () => {
  const renderCustomTabBar = (props) => (
    <TabsBar
      {...props}
      style={{ backgroundColor: 'custom-color' }}
      underlineStyle={{ height: 3, backgroundColor: 'blue' }}
    />
  );

  return (
    <TabsList
      renderTabBar={renderCustomTabBar}
      onChangeTab={(props) => console.log('Tab changed:', props.i)}
    >
      {/* Your tab content */}
    </TabsList>
  );
};
```

### Migration from react-native-scrollable-tab-view

**Before:**

```tsx
import ScrollableTabView from 'react-native-scrollable-tab-view';
import TabBar from '../TabBar';

<ScrollableTabView
  renderTabBar={(props) => <TabBar {...props} />}
  onChangeTab={onChangeTab}
  initialPage={0}
>
  <View key="tab1" tabLabel="Tab 1">
    {/* content */}
  </View>
</ScrollableTabView>;
```

**After:**

```tsx
import { TabsList } from '../Tabs';

<TabsList onChangeTab={onChangeTab} initialPage={0}>
  <View key="tab1" tabLabel="Tab 1">
    {/* content */}
  </View>
</TabsList>;
```

## Props

### TabsList Props

| Prop             | Type                   | Default | Description                               |
| ---------------- | ---------------------- | ------- | ----------------------------------------- |
| `children`       | `React.ReactElement[]` | -       | Tab content elements with `tabLabel` prop |
| `initialPage`    | `number`               | `0`     | Initial active tab index                  |
| `scrollEnabled`  | `boolean`              | `true`  | Whether tabs should scroll horizontally   |
| `onChangeTab`    | `function`             | -       | Callback when tab changes                 |
| `locked`         | `boolean`              | `false` | Whether tabs are disabled                 |
| `renderTabBar`   | `function`             | -       | Custom tab bar renderer                   |
| `style`          | `ViewStyle`            | -       | Container styling                         |
| `tabStyle`       | `ViewStyle`            | -       | Individual tab styling                    |
| `textStyle`      | `ViewStyle`            | -       | Tab text styling                          |
| `underlineStyle` | `ViewStyle`            | -       | Underline styling                         |

### TabsBar Props

| Prop            | Type        | Default | Description                 |
| --------------- | ----------- | ------- | --------------------------- |
| `tabs`          | `TabItem[]` | -       | Array of tab items          |
| `activeIndex`   | `number`    | -       | Current active tab index    |
| `onTabPress`    | `function`  | -       | Tab press callback          |
| `scrollEnabled` | `boolean`   | `true`  | Enable horizontal scrolling |
| `locked`        | `boolean`   | `false` | Disable tab interactions    |

### Tab Props

| Prop       | Type       | Default | Description           |
| ---------- | ---------- | ------- | --------------------- |
| `label`    | `string`   | -       | Tab label text        |
| `isActive` | `boolean`  | -       | Whether tab is active |
| `onPress`  | `function` | -       | Press callback        |

## Ref Methods

The `TabsList` component exposes these methods via ref:

- `goToPage(pageNumber: number)`: Navigate to specific tab
- `getCurrentIndex()`: Get current active tab index

```tsx
const tabsRef = useRef<TabsListRef>(null);

// Navigate to second tab
tabsRef.current?.goToPage(1);

// Get current tab index
const currentIndex = tabsRef.current?.getCurrentIndex();
```

## Testing

Run tests with:

```bash
yarn jest Tabs
```

## Storybook

View component examples in Storybook under "Components Temp / Tabs".
