# ScrollSyncedVirtualizedList

A high-performance virtualized list component that syncs with parent scroll position for optimal rendering of large datasets.

## Overview

`ScrollSyncedVirtualizedList` implements spacer-based virtualization, where only visible items are rendered while invisible spacers maintain proper scroll physics and positioning. It's designed to work within a parent ScrollView and responds to the parent's scroll position to determine which items should be visible.

## Key Features

- ✅ **Performance Optimized**: Renders only visible items for large datasets
- ✅ **Scroll Physics**: Maintains proper scroll behavior with spacers
- ✅ **Parent Sync**: Syncs with parent ScrollView scroll position
- ✅ **Flexible Components**: Supports header, footer, and empty state components
- ✅ **Predictable Layout**: Fixed item height for consistent rendering
- ✅ **TypeScript Support**: Fully typed with comprehensive interfaces

## File Structure

```
app/component-library/components/ScrollSyncedVirtualizedList/
├── ScrollSyncedVirtualizedList.tsx       # Main component
├── ScrollSyncedVirtualizedList.types.ts  # TypeScript interfaces
├── ScrollSyncedVirtualizedList.test.tsx  # Comprehensive tests
├── ScrollSyncedVirtualizedList.stories.tsx # Storybook stories
├── index.ts                              # Exports
└── README.md                            # Documentation
```

## Usage

### Basic Example

```tsx
import { ScrollSyncedVirtualizedList } from '../../component-library/components/ScrollSyncedVirtualizedList';
import type { ScrollSyncedVirtualizedListProps } from '../../component-library/components/ScrollSyncedVirtualizedList';

const MyList = ({ data, parentScrollY, parentViewportHeight }) => (
  <ScrollSyncedVirtualizedList
    data={data}
    renderItem={({ item }) => <ItemComponent item={item} />}
    itemHeight={64}
    parentScrollY={parentScrollY}
    _parentViewportHeight={parentViewportHeight}
    keyExtractor={(item) => item.id}
  />
);
```

### With Header and Footer

```tsx
<ScrollSyncedVirtualizedList
  data={items}
  renderItem={renderItem}
  itemHeight={80}
  parentScrollY={scrollY}
  _parentViewportHeight={viewportHeight}
  ListHeaderComponent={<HeaderComponent />}
  ListFooterComponent={<FooterComponent />}
  ListEmptyComponent={<EmptyStateComponent />}
  keyExtractor={(item) => item.id}
  testID="my-virtualized-list"
/>
```

## Props

| Prop                    | Type                                                               | Required | Description                                      |
| ----------------------- | ------------------------------------------------------------------ | -------- | ------------------------------------------------ |
| `data`                  | `T[]`                                                              | ✅       | Array of data items to render                    |
| `renderItem`            | `(info: { item: T; index: number }) => React.ReactElement \| null` | ✅       | Function to render each item                     |
| `itemHeight`            | `number`                                                           | ✅       | Fixed height of each item in pixels              |
| `parentScrollY`         | `number`                                                           | ✅       | Current scroll position of the parent ScrollView |
| `_parentViewportHeight` | `number`                                                           | ✅       | Viewport height of the parent scroll container   |
| `keyExtractor`          | `(item: T, index: number) => string`                               | ❌       | Function to extract unique key for each item     |
| `testID`                | `string`                                                           | ❌       | Test ID for the container                        |
| `ListHeaderComponent`   | `React.ComponentType \| React.ReactElement \| null`                | ❌       | Optional header component                        |
| `ListFooterComponent`   | `React.ComponentType \| React.ReactElement \| null`                | ❌       | Optional footer component                        |
| `ListEmptyComponent`    | `React.ComponentType \| React.ReactElement \| null`                | ❌       | Optional empty state component                   |

## How Virtualization Works

The component uses a sophisticated virtualization algorithm:

1. **Initial Load**: Shows first 6 items when scroll is at the top
2. **Scroll-based Rendering**: Calculates visible items based on scroll position
3. **Buffer Zones**: Renders 5 items above and 10 items below current position
4. **Spacer Management**: Uses top and bottom spacers to maintain scroll physics
5. **Dynamic Measurements**: Automatically measures header and footer heights
6. **Performance**: Only re-renders when scroll position significantly changes

## Performance Characteristics

- **Memory Efficient**: Only renders ~15 items regardless of dataset size
- **Smooth Scrolling**: Maintains 60fps with proper spacer calculations
- **Predictable**: Fixed item heights ensure consistent performance
- **Optimized Re-renders**: Uses React.useMemo for expensive calculations

## Integration with TabsList

This component is specifically designed to work with the `TabsList` component's dynamic height system:

```tsx
// In TabsList component
<ScrollSyncedVirtualizedList
  data={tabData}
  renderItem={renderTabItem}
  itemHeight={64}
  parentScrollY={parentScrollY}
  _parentViewportHeight={parentViewportHeight}
/>
```

The component automatically:

- Measures its content height
- Reports height changes to parent
- Adapts to parent scroll position
- Maintains virtualization during tab switches

## Testing

The component includes comprehensive tests covering:

- ✅ Basic rendering scenarios
- ✅ Virtualization behavior
- ✅ Header/footer components
- ✅ Layout handling
- ✅ Key extraction
- ✅ Edge cases
- ✅ Performance characteristics
- ✅ Accessibility features

Run tests with:

```bash
yarn jest ScrollSyncedVirtualizedList.test.tsx
```

## Storybook

Interactive examples are available in Storybook:

- **Default**: Basic list with sample data
- **With Header/Footer**: Complete layout example
- **Rich Items**: Complex item layouts
- **Empty State**: No data scenario
- **Large Dataset**: Performance demonstration
- **Small Items**: Compact layout
- **Static Scroll**: Fixed scroll position

## Migration from ExternalVirtualized

This component replaces the previous `ExternalVirtualized` component with:

- ✅ Better naming that reflects its purpose
- ✅ Improved documentation and TypeScript support
- ✅ Comprehensive test coverage
- ✅ Storybook examples
- ✅ Performance optimizations

### Migration Steps

1. Update imports:

   ```tsx
   // Before
   import { ExternalVirtualized } from '../ExternalVirtualized';

   // After
   import { ScrollSyncedVirtualizedList } from '../ScrollSyncedVirtualizedList';
   ```

2. Update component usage:

   ```tsx
   // Before
   <ExternalVirtualized {...props} />

   // After
   <ScrollSyncedVirtualizedList {...props} />
   ```

The API is identical, so no other changes are required.

## Best Practices

1. **Fixed Item Heights**: Always use consistent item heights for predictable performance
2. **Key Extraction**: Provide stable, unique keys for optimal React rendering
3. **Parent Integration**: Ensure parent ScrollView properly passes scroll position
4. **Memory Management**: Use React.memo for complex item components
5. **Testing**: Test with large datasets to verify virtualization behavior

## Troubleshooting

### Common Issues

**Items not rendering correctly:**

- Verify `itemHeight` matches actual rendered item height
- Check that `parentScrollY` is being updated correctly
- Ensure `keyExtractor` returns unique, stable keys

**Performance issues:**

- Use React.memo for expensive item components
- Avoid complex calculations in renderItem
- Check that parent scroll events are throttled

**Layout problems:**

- Verify parent container has proper dimensions
- Check that `_parentViewportHeight` is accurate
- Ensure fixed item heights are consistent

## Related Components

- **TabsList**: Parent component that manages tab switching and scroll
- **TokenList**: Uses this component for token virtualization
- **DeFiPositionsList**: Uses this component for DeFi position virtualization
- **CollectibleContracts**: Uses this component for NFT collection virtualization
