# Tabs Component

A custom implementation to replace `react-native-scrollable-tab-view` with improved functionality and better design system integration.

## Features

- ✅ **Dynamic Heights**: Each tab content can use its own height (not limited by the tallest content)
- ✅ **Lazy Loading**: Active tab loads immediately, other tabs load in background for better performance
- ✅ **Swipeable Content**: Horizontal swipe gestures to navigate between tabs with visual feedback
- ✅ **Individual Tab Disabling**: Each tab can be individually disabled with `isDisabled` prop
- ✅ **Smooth Animations**: Underline animates smoothly between tabs
- ✅ **Horizontal Scrolling**: Automatically scrolls when there are many tabs
- ✅ **MetaMask Design System**: Built with `@metamask/design-system-react-native` components
- ✅ **BoxProps Extension**: TabsList extends BoxProps for flexible styling
- ✅ **PressableProps Extension**: Tab extends PressableProps for enhanced interaction
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
    <View key="defi" tabLabel="DeFi" isDisabled>
      <Text>DeFi content here (disabled)</Text>
    </View>
  </TabsList>
);
```

### Advanced Example with BoxProps Styling

```tsx
import React from 'react';
import { View } from 'react-native';
import { Text, BoxFlexDirection } from '@metamask/design-system-react-native';
import { TabsList } from '../Tabs';

const MyComponent = () => {
  const handleTabChange = (props) => {
    console.log('Tab changed to index:', props.i);
  };

  return (
    <TabsList
      initialActiveIndex={1}
      onChangeTab={handleTabChange}
      twClassName="bg-background-alternative"
      padding={4}
      flexDirection={BoxFlexDirection.Column}
    >
      <View key="overview" tabLabel="Overview">
        <Text>Overview content</Text>
      </View>
      <View key="details" tabLabel="Details">
        <Text>Details content</Text>
      </View>
      <View key="settings" tabLabel="Settings" isDisabled>
        <Text>Settings content (disabled)</Text>
      </View>
    </TabsList>
  );
};
```

### Swipe Gestures

The component now supports horizontal swipe gestures similar to `react-native-scrollable-tab-view`:

- **Swipe Left**: Navigate to the next tab
- **Swipe Right**: Navigate to the previous tab
- **Visual Feedback**: Content slides horizontally during navigation
- **Disabled Tab Handling**: Swipes skip over disabled tabs automatically

### Lazy Loading

For better performance, the component implements intelligent lazy loading:

- **Active Tab**: Loads immediately when the component mounts
- **Background Loading**: Non-disabled tabs load automatically after a short delay
- **On-Demand Loading**: Tabs load when accessed via swipe or tap
- **Memory Efficient**: Only loaded tabs consume memory

### Migration from react-native-scrollable-tab-view

**Before:**

```tsx
import ScrollableTabView from 'react-native-scrollable-tab-view';
import TabBar from '../TabBar';

<ScrollableTabView
  renderTabBar={(props) => <TabBar {...props} />}
  onChangeTab={onChangeTab}
  initialPage={0}
  locked={false} // Enable swipe gestures
>
  <View key="tab1" tabLabel="Tab 1">
    {/* content */}
  </View>
</ScrollableTabView>;
```

**After:**

```tsx
import { TabsList } from '../Tabs';

<TabsList onChangeTab={onChangeTab} initialActiveIndex={0}>
  <View key="tab1" tabLabel="Tab 1">
    {/* content */}
  </View>
  <View key="tab2" tabLabel="Tab 2" isDisabled>
    {/* disabled content */}
  </View>
</TabsList>;
```

**Key Improvements:**

- ✅ Swipe gestures work out of the box (no `locked` prop needed)
- ✅ Individual tab disabling (not available in react-native-scrollable-tab-view)
- ✅ Dynamic heights per tab
- ✅ Lazy loading for better performance
- ✅ Better design system integration

## Props

### TabsList Props

`TabsList` extends `BoxProps` from `@metamask/design-system-react-native`, so it accepts all Box props plus:

| Prop                 | Type                   | Default | Description                               |
| -------------------- | ---------------------- | ------- | ----------------------------------------- |
| `children`           | `React.ReactElement[]` | -       | Tab content elements with `tabLabel` prop |
| `initialActiveIndex` | `number`               | `0`     | Initial active tab index                  |
| `onChangeTab`        | `function`             | -       | Callback when tab changes                 |

### Child Element Props (TabViewProps)

Elements passed as children to `TabsList` should have these props:

| Prop         | Type      | Default | Description                    |
| ------------ | --------- | ------- | ------------------------------ |
| `tabLabel`   | `string`  | -       | Label displayed in the tab     |
| `isDisabled` | `boolean` | `false` | Whether this tab is disabled   |
| `key`        | `string`  | -       | Unique key for React rendering |

### TabsBar Props

`TabsBar` extends `BoxProps` from `@metamask/design-system-react-native`, so it accepts all Box props plus:

| Prop          | Type        | Default | Description              |
| ------------- | ----------- | ------- | ------------------------ |
| `tabs`        | `TabItem[]` | -       | Array of tab items       |
| `activeIndex` | `number`    | -       | Current active tab index |
| `onTabPress`  | `function`  | -       | Tab press callback       |

### Tab Props

`Tab` extends `PressableProps` from React Native, so it accepts all Pressable props plus:

| Prop         | Type       | Default | Description             |
| ------------ | ---------- | ------- | ----------------------- |
| `label`      | `string`   | -       | Tab label text          |
| `isActive`   | `boolean`  | -       | Whether tab is active   |
| `isDisabled` | `boolean`  | `false` | Whether tab is disabled |
| `onPress`    | `function` | -       | Press callback          |

## Ref Methods

The `TabsList` component exposes these methods via ref:

- `goToTabIndex(tabIndex: number)`: Navigate to specific tab by index
- `getCurrentIndex()`: Get current active tab index

```tsx
import { useRef } from 'react';
import { TabsListRef } from '../Tabs';

const tabsRef = useRef<TabsListRef>(null);

// Navigate to second tab (index 1)
tabsRef.current?.goToTabIndex(1);

// Get current tab index
const currentIndex = tabsRef.current?.getCurrentIndex();

// Note: Navigation will be ignored if the target tab is disabled
```

## Testing

Run tests with:

```bash
yarn jest Tabs
```

## Storybook

View component examples in Storybook under "Components Temp / Tabs".
