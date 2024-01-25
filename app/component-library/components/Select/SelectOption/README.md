# SelectOption

`SelectOption` is a selectable option used in the SelectMenu and is part of the Select component

## Props

This component extends [SelectValueProps](../SelectValue/SelectValue.types.ts) and [ListItemSelectProps](../../List/ListItemSelect/ListItemSelect.types.ts) from the [SelectValue](../SelectValue/SelectValue.tsx) and [ListItemSelect](../../List/ListItemSelect/ListItemSelect.tsx) components.

### `iconEl`

Optional prop to replace the start Icon Element

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Avatar-like Elements                                              | No                                                     |

### `iconProps`

Optional prop for the start Icon Element

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| AvatarProps                                              | No                                                     |

### `label`

Optional prop for the label of SelectOption

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string or ReactNode                                              | No                                                     |

### `description`

Optional description below the label

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string or ReactNode                                              | No                                                     |

### `isSelected`

Optional prop to determine if the item is selected

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean    | No                                                     | false                                               |

### `isDisabled`

Optional prop to determine if the item is disabled

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean    | No                                                     | false                                               |

## Custom Props

### `startAccessory`

Optional content to be displayed before the info section

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                              | No                                                     |

### `children`

Optional content to be displayed in the info section

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                              | No                                                     |

### `endAccessory`

Optional content to be displayed after the info section

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                              | No                                                     |

### `gap`

Optional prop to configure the gap between items inside the ListItem

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| number or string                                            | No                                                     |                   16                                         |

### `verticalAlignment`

Optional prop to configure the vertical alignment between items inside the ListItem

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| VerticalAlignment                                            | No                                                     |                   VerticalAlignment.Top                                         |

## Usage

```javascript
// Common use case
<SelectOption 
    iconProps={SAMPLE_ICON_PROPS}
    label={SAMPLE_LABEL_TEXT}
    description={SAMPLE_DESCRIPTION_TEXT}
    isSelected={false}
    isDisabled={false}
/>

// Custom starting icon
<SelectOption 
    label={SAMPLE_LABEL_TEXT}
    description={SAMPLE_DESCRIPTION_TEXT}
    iconEl={SAMPLE_ICON_EL}
    isSelected={false}
    isDisabled={false}
/>

// Custom starting accessory
<SelectOption 
    label={SAMPLE_LABEL_TEXT}
    description={SAMPLE_DESCRIPTION_TEXT}
    startAccessory={SAMPLE_STARTACCESSORY_EL}
    isSelected={false}
    isDisabled={false}
/>

// Custom ending accessory
<SelectOption 
    label={SAMPLE_LABEL_TEXT}
    description={SAMPLE_DESCRIPTION_TEXT}
    endAccessory={SAMPLE_ENDACCESSORY_EL}
    isSelected={false}
    isDisabled={false}
/>

// Custom info section
<SelectOption 
    isSelected={false}
    isDisabled={false}>
    {SAMPLE_CHILDREN}
</SelectOption>
```
