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

// With custom text props for styling
<ActionListItem
  label="Custom Styled Label"
  description="Custom styled description"
  iconName={IconName.Settings}
  labelTextProps={{
    variant: TextVariant.HeadingSm,
    color: TextColor.TextPrimary,
    fontWeight: FontWeight.Bold,
  }}
  descriptionTextProps={{
    variant: TextVariant.BodyXs,
    color: TextColor.TextMuted,
  }}
  iconProps={{
    size: IconSize.Lg,
    color: IconColor.IconAlternative,
  }}
  onPress={() => console.log('Pressed')}
/>

// Note: labelTextProps and descriptionTextProps only apply when
// label/description are strings, not React nodes
<ActionListItem
  label="This will use labelTextProps"
  description="This will use descriptionTextProps"
  labelTextProps={{ color: TextColor.TextSuccess }}
  descriptionTextProps={{ variant: TextVariant.BodyXs }}
  onPress={() => console.log('Pressed')}
/>
```

## Props

| Prop                   | Type                  | Required | Description                                                                             |
| ---------------------- | --------------------- | -------- | --------------------------------------------------------------------------------------- |
| `label`                | `string \| ReactNode` | Yes      | Label text or component to display                                                      |
| `description`          | `string \| ReactNode` | No       | Optional description text or component                                                  |
| `startAccessory`       | `ReactNode`           | No       | Optional component to display on the left side                                          |
| `endAccessory`         | `ReactNode`           | No       | Optional component to display on the right side                                         |
| `iconName`             | `IconName`            | No       | Optional icon name from design system (ignored if startAccessory is provided)           |
| `labelTextProps`       | `Partial<TextProps>`  | No       | Optional props to spread to the label Text component when label is a string             |
| `descriptionTextProps` | `Partial<TextProps>`  | No       | Optional props to spread to the description Text component when description is a string |
| `iconProps`            | `Partial<IconProps>`  | No       | Optional props to spread to the Icon component when iconName is provided                |
| `...pressableProps`    | `PressableProps`      | No       | All other Pressable props (onPress, etc.)                                               |

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

## Prop Behavior Notes

- **labelTextProps**: Only applied when `label` is a string. When `label` is a ReactNode, these props are ignored.
- **descriptionTextProps**: Only applied when `description` is a string. When `description` is a ReactNode, these props are ignored.
- **iconProps**: Only applied when `iconName` is provided and no `startAccessory` is given. Props are spread to the Icon component and can override default values like size and color.
- All three props use `Partial<>` types, so you only need to provide the specific properties you want to override.
