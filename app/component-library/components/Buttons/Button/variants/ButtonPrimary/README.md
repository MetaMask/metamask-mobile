# ButtonPrimary

ButtonPrimary is used for primary call to actions.

## Props

This component extends [ButtonBaseProps](../ButtonBase/ButtonBase.types.ts) from [ButtonBase](../ButtonBase/ButtonBase.tsx) component.

## Common Props

### `label`

ButtonBase text.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `size`

Optional prop for the size of the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [ButtonSize](../../Button.types.ts)                 | Yes                                                     | Md                                                     |

### `onPress`

Function to trigger when pressing the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | Yes                                                     |

### `startIconName`

Optional prop for the icon name of the icon that will be displayed before the label.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconName](../Icons/Icon.types.ts)                  | No                                                      |

### `endIconName`

Optional prop for the icon name of the icon that will be displayed after the label.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconName](../Icons/Icon.types.ts)                  | No                                                      |

### `isDanger`

Optional boolean to show the danger state of the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | false                                                  |

### `isInverse`

Optional boolean to show the inverse state of the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | false                                                  |

### `width`

Optional param to control the width of the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [ButtonWidthTypes](../../Button.types.ts) or number | No                                                      | ButtonWidthTypes.Auto                                  |

## Usage

```javascript
// Default Primary - Blue background, white text
<ButtonPrimary
  label="Continue"
  onPress={handleContinue}
/>

// Danger - Red background, white text
<ButtonPrimary
  label="Delete"
  isDanger
  onPress={handleDelete}
/>

// Inverse - White background, dark text
<ButtonPrimary
  label="Cancel"
  isInverse
  onPress={handleCancel}
/>

// Inverse + Danger - White background, red text
<ButtonPrimary
  label="Remove"
  isInverse
  isDanger
  onPress={handleRemove}
/>

// With icons and custom sizing
<ButtonPrimary
  label="Transfer"
  startIconName={IconName.Bank}
  endIconName={IconName.ArrowRight}
  size={ButtonSize.Md}
  onPress={handleTransfer}
  width={ButtonWidthTypes.Auto}
/>
```
