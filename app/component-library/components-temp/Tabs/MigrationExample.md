# Migration Guide: From ScrollableTabView to TabsList

This guide shows how to migrate from `react-native-scrollable-tab-view` to the new `TabsList` component.

## Key Benefits of Migration

1. **Dynamic Heights**: Each tab content can have its own height
2. **Better Design System Integration**: Uses MetaMask design tokens and components
3. **Improved Performance**: No dependency on external library
4. **Better TypeScript Support**: Full type safety
5. **Easier Customization**: Direct control over styling and behavior

## Migration Steps

### 1. Replace Import

**Before:**

```tsx
import ScrollableTabView from 'react-native-scrollable-tab-view';
import TabBar from '../TabBar';
```

**After:**

```tsx
import { TabsList } from '../Tabs';
```

### 2. Update Component Usage

**Before:**

```tsx
<ScrollableTabView
  renderTabBar={(props) => <TabBar {...props} />}
  onChangeTab={onChangeTab}
  initialPage={0}
  locked={isLocked}
>
  <View key="tokens" tabLabel="Tokens">
    <TokensView />
  </View>
  <View key="nfts" tabLabel="NFTs">
    <NFTsView />
  </View>
</ScrollableTabView>
```

**After:**

```tsx
<TabsList onChangeTab={onChangeTab} initialPage={0} locked={isLocked}>
  <View key="tokens" tabLabel="Tokens">
    <TokensView />
  </View>
  <View key="nfts" tabLabel="NFTs">
    <NFTsView />
  </View>
</TabsList>
```

### 3. Update Ref Usage (if applicable)

**Before:**

```tsx
const scrollableTabViewRef = useRef<
  ScrollableTabView & { goToPage: (pageNumber: number) => void }
>(null);

// Usage
scrollableTabViewRef.current?.goToPage(1);
```

**After:**

```tsx
import { TabsListRef } from '../Tabs';

const tabsListRef = useRef<TabsListRef>(null);

// Usage
tabsListRef.current?.goToPage(1);
```

### 4. Custom Tab Bar Styling

**Before:**

```tsx
const renderTabBar = useCallback(
  (tabBarProps) => (
    <TabBar
      style={styles.tabBar}
      {...tabBarProps}
      tabStyle={styles.tabStyle}
      textStyle={styles.textStyle}
    />
  ),
  [styles],
);
```

**After:**

```tsx
const renderTabBar = useCallback(
  (tabBarProps) => (
    <TabsBar
      {...tabBarProps}
      style={styles.tabBar}
      tabStyle={styles.tabStyle}
      textStyle={styles.textStyle}
    />
  ),
  [styles],
);
```

## Example: Wallet Component Migration

### Original Implementation

```tsx
// app/components/Views/Wallet/index.tsx
<ScrollableTabView
  ref={scrollableTabViewRef}
  renderTabBar={renderTabBar}
  onChangeTab={handleTabChange}
>
  <Tokens {...tokensTabProps} key={tokensTabProps.key} />
  {isPerpsEnabled && (
    <PerpsTabView {...perpsTabProps} key={perpsTabProps.key} />
  )}
  {defiEnabled && (
    <DeFiPositionsList
      {...defiPositionsTabProps}
      key={defiPositionsTabProps.key}
    />
  )}
</ScrollableTabView>
```

### Migrated Implementation

```tsx
import {
  TabsList,
  TabsListRef,
} from '../../../component-library/components-temp/Tabs';

const tabsListRef = useRef<TabsListRef>(null);

<TabsList ref={tabsListRef} onChangeTab={handleTabChange}>
  <Tokens {...tokensTabProps} key={tokensTabProps.key} />
  {isPerpsEnabled && (
    <PerpsTabView {...perpsTabProps} key={perpsTabProps.key} />
  )}
  {defiEnabled && (
    <DeFiPositionsList
      {...defiPositionsTabProps}
      key={defiPositionsTabProps.key}
    />
  )}
</TabsList>;
```

## Differences and Breaking Changes

### Height Management

- **Old**: All tab content forced to same height (tallest content)
- **New**: Each tab content can have its own height

### Tab Bar Rendering

- **Old**: Required `renderTabBar` prop with custom TabBar component
- **New**: Uses built-in TabsBar by default, `renderTabBar` is optional

### Animation Performance

- **Old**: Uses external library animations
- **New**: Uses React Native's Animated API for better performance

### Styling

- **Old**: Uses StyleSheet with theme colors
- **New**: Uses Tailwind CSS with design system tokens

## Testing Changes

Update your tests to import from the new location:

```tsx
// Before
import ScrollableTabView from 'react-native-scrollable-tab-view';

// After
import { TabsList } from '../Tabs';
```

The component API is largely compatible, so most tests should work with minimal changes.
