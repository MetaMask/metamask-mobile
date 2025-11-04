# ButtonFilter

`ButtonFilter` is a reusable filter button component that displays an active or inactive state. It's commonly used for filtering lists or toggling between different views.

## Props

This component extends `PressableProps` from React Native, so all Pressable props are available.

### Required

- **`label`** (string): The label text to display in the button.

### Optional

- **`isActive`** (boolean): Whether the button is in an active state. Defaults to `false`.
- **`labelProps`** (Partial\<TextProps\>): Optional additional props to pass to the Text component.
- **`...PressableProps`**: All props from React Native's `Pressable` component (including `onPress`, `disabled`, `testID`, etc.)

## Usage

```tsx
import ButtonFilter from 'app/component-library/components-temp/ButtonFilter';

const MyComponent = () => {
  const [filter, setFilter] = useState('all');

  return (
    <ButtonFilter
      label="All"
      isActive={filter === 'all'}
      onPress={() => setFilter('all')}
    />
  );
};
```

## Styling

The component uses Tailwind CSS via the `useTailwind` hook and follows the MetaMask Design System styling patterns:

- **Active state**: Uses `bg-icon-default` background with `text-icon-inverse` text color
- **Inactive state**: Uses `bg-background-muted` background with `text-default` text color
- **Pressed state**: Applies `opacity-70` for visual feedback

## Example

```tsx
<Box flexDirection={BoxFlexDirection.Row} gap={3}>
  <ButtonFilter
    label="All"
    isActive={currentFilter === 'all'}
    onPress={() => setCurrentFilter('all')}
  />
  <ButtonFilter
    label="Purchased"
    isActive={currentFilter === 'purchased'}
    onPress={() => setCurrentFilter('purchased')}
  />
  <ButtonFilter
    label="Sold"
    isActive={currentFilter === 'sold'}
    onPress={() => setCurrentFilter('sold')}
  />
</Box>
```

