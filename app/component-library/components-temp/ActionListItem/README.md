# ActionListItem

A clickable list item component built on React Native's Pressable that can display a label, description, and optional start/end accessories.

## Usage

```tsx
import ActionListItem from './ActionListItem';
import { IconName } from '../../components/Icons/Icon';

// Basic usage with string label and description
<ActionListItem
  label="Settings"
  description="Manage your account preferences"
  onPress={() => console.log('Pressed')}
/>

// With icon
<ActionListItem
  iconName={IconName.Settings}
  label="Settings"
  description="Manage your account preferences"
  onPress={() => console.log('Pressed')}
/>

// With custom accessories
<ActionListItem
  startAccessory={<CustomIcon />}
  label="Custom Action"
  description="This uses a custom start accessory"
  endAccessory={<ChevronRight />}
  onPress={() => console.log('Pressed')}
/>

// With React nodes for label and description
<ActionListItem
  label={<CustomLabelComponent />}
  description={<CustomDescriptionComponent />}
  onPress={() => console.log('Pressed')}
/>
```

## Props

| Prop                | Type                  | Required | Description                                                                   |
| ------------------- | --------------------- | -------- | ----------------------------------------------------------------------------- |
| `label`             | `string \| ReactNode` | Yes      | Label text or component to display                                            |
| `description`       | `string \| ReactNode` | No       | Optional description text or component                                        |
| `startAccessory`    | `ReactNode`           | No       | Optional component to display on the left side                                |
| `endAccessory`      | `ReactNode`           | No       | Optional component to display on the right side                               |
| `iconName`          | `IconName`            | No       | Optional icon name from design system (ignored if startAccessory is provided) |
| `...pressableProps` | `PressableProps`      | No       | All other Pressable props (onPress, etc.)                                     |

## Design Specifications

- **Background**: `bg-default` on default state, `bg-default-pressed` when pressed
- **Padding**: 12px vertical, 16px horizontal
- **Gap**: 16px between start content and end accessory
- **Label**: Uses `TextVariant.BodyMD` with `TextColor.Default` for strings
- **Description**: Uses `TextVariant.BodySM` with `TextColor.Alternative` for strings
- **Icon**: Uses `IconSize.Md` with `IconColor.Alternative` when iconName is provided
- **Layout**: Start accessory/icon and label are horizontally aligned, description appears below label

## Priority

- If both `startAccessory` and `iconName` are provided, `startAccessory` takes precedence
- Icon is only rendered if `iconName` is provided and `startAccessory` is not provided
