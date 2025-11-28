# ButtonFilter

`ButtonFilter` is a reusable filter button component that displays an active or inactive state. It's commonly used for filtering lists or toggling between different views.

## Props

This component extends `ButtonBaseProps` from `@metamask/design-system-react-native`, so all ButtonBase props are available.

### Required

- **`children`** (string | ReactNode): The content to display in the button.
- **`onPress`** (function): Function to trigger when pressing the button.

### Optional

- **`isActive`** (boolean): Whether the button is in an active state. Defaults to `false`.
- **`size`** (ButtonSize): The size of the button. Defaults to `Md`.
- **`isDisabled`** (boolean): Whether the button is disabled.
- **`isLoading`** (boolean): Whether the button is in a loading state.
- **`startIconName`** (IconName): Icon to display before the content.
- **`endIconName`** (IconName): Icon to display after the content.
- **`...ButtonBaseProps`**: All other props from ButtonBase (including `testID`, `accessibilityLabel`, etc.)

## Usage

```tsx
import ButtonFilter from 'app/component-library/components-temp/ButtonFilter';

const MyComponent = () => {
  const [filter, setFilter] = useState('all');

  return (
    <ButtonFilter isActive={filter === 'all'} onPress={() => setFilter('all')}>
      All
    </ButtonFilter>
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
