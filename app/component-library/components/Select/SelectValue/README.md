# SelectValue

SelectValue is a content component, used inside the SelectButton or SelectOption.

## Props

This component extends [SelectValueBaseProps](./foundation/SelectValueBase.types.ts) from the [SelectValueBase](./foundation/SelectValueBase.tsx) component.

### `iconEl`

Optional prop for the start Icon Element.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Avatar-like Elements                                              | No                                                     |

### `iconProps`

Optional prop for the start Icon Element.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| AvatarProps                                              | No                                                     |

### `label`

Optional prop for the label of SelectValue.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string or ReactNode                                              | No                                                     |

### `description`

Optional description below the label.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string or ReactNode                                              | No                                                     |

## Custom Props

### `startAccessory`

Optional content to be displayed before the info section.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                              | No                                                     |

### `children`

Optional content to be displayed in the info section.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                              | No                                                     |

### `endAccessory`

Optional content to be displayed after the info section.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                              | No                                                     |

## Usage

```javascript
// Common use case
<SelectValue 
    iconProps={SAMPLE_ICON_PROPS}
    label={SAMPLE_LABEL_TEXT}
    description={SAMPLE_DESCRIPTION_TEXT}
/>

// Custom starting icon
<SelectValue 
    label={SAMPLE_LABEL_TEXT}
    description={SAMPLE_DESCRIPTION_TEXT}
    iconEl={SAMPLE_ICON_EL}
/>

// Custom starting accessory
<SelectValue 
    label={SAMPLE_LABEL_TEXT}
    description={SAMPLE_DESCRIPTION_TEXT}
    startAccessory={SAMPLE_STARTACCESSORY_EL}
/>

// Custom ending accessory
<SelectValue 
    label={SAMPLE_LABEL_TEXT}
    description={SAMPLE_DESCRIPTION_TEXT}
    endAccessory={SAMPLE_ENDACCESSORY_EL}
/>

// Custom info session
<SelectValue>
    {SAMPLE_CHILDREN}
</SelectValue>
```
