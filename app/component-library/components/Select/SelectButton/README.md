# SelectButton

`SelectButton` is a trigger component, used as part of the `SelectWrapper` or `Select` component

## Props

This component extends [SelectButtonBaseProps](./foundation/SelectButtonBase.types.ts) from the [SelectButtonBase](./foundation/SelectButtonBase.tsx) component

### `size`

Optional enum to select between `SelectButton` sizes

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [SelectButtonSize](./SelectButton.types.ts)                   | No                                                      | SelectButtonSize.Md                                                |

### `isDisabled`

Optional prop to configure the disabled state

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                         | No                                                      | false                                                |

### `isDanger`

Optional prop to configure the danger state

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                         | No                                                      | false                                                |

### `iconEl`

Optional prop for the start Icon Element

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Avatar-like Elements                                              | No                                                     |

### `iconProps`

Optional prop for the start Icon Element

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| AvatarProps                                              | No                                                     |

### `label`

Optional prop for the label of `SelectValue`

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string or ReactNode                                              | No                                                     |

### `description`

Optional description below the label

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string or ReactNode                                              | No                                                     |

## Custom Props

### `caretIconEl`

Optional enum to replace the caret `Icon`

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                              | No                                                     |

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

## Usage

```javascript
// Common use case
<SelectButton 
    iconProps={SAMPLE_ICON_PROPS}
    label={SAMPLE_LABEL_TEXT}
    description={SAMPLE_DESCRIPTION_TEXT}
    size={SelectButtonSize.Md}
    isDisabled={false}
    isDanger={false}
/>

// Custom Caret
<SelectButton 
    iconProps={SAMPLE_ICON_PROPS}
    label={SAMPLE_LABEL_TEXT}
    description={SAMPLE_DESCRIPTION_TEXT}
    size={SelectButtonSize.Md}
    isDisabled={false}
    isDanger={false}
    caretIconEl={SAMPLE_CARETICON_EL}
/>

// Custom starting icon
<SelectButton 
    label={SAMPLE_LABEL_TEXT}
    description={SAMPLE_DESCRIPTION_TEXT}
    size={SelectButtonSize.Md}
    isDisabled={false}
    isDanger={false}
    iconEl={SAMPLE_ICON_EL}
/>

// Custom starting accessory
<SelectButton 
    label={SAMPLE_LABEL_TEXT}
    description={SAMPLE_DESCRIPTION_TEXT}
    size={SelectButtonSize.Md}
    isDisabled={false}
    isDanger={false}
    startAccessory={SAMPLE_STARTACCESSORY_EL}
/>

// Custom ending accessory
<SelectButton 
    label={SAMPLE_LABEL_TEXT}
    description={SAMPLE_DESCRIPTION_TEXT}
    size={SelectButtonSize.Md}
    isDisabled={false}
    isDanger={false}
    endAccessory={SAMPLE_ENDACCESSORY_EL}
/>

// Custom info session
<SelectButton 
    size={SelectButtonSize.Md}
    isDisabled={false}
    isDanger={false}
>
    {SAMPLE_CHILDREN}
</SelectButton>
```
