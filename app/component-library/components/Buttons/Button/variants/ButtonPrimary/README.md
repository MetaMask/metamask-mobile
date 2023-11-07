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
| [ButtonSize](../../Button.types.ts)          | Yes                                                     | Md                                                     |

### `onPress`

Function to trigger when pressing the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | Yes                                                     |

### `startIconName`

Optional prop for the icon name of the icon that will be displayed before the label.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconName](../Icons/Icon.types.ts)                | No                                                   |

### `endIconName`

Optional prop for the icon name of the icon that will be displayed after the label.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconName](../Icons/Icon.types.ts)                | No                                                   |

### `isDanger`

Optional boolean to show the danger state of the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | false                                                   |

### `width`

Optional param to control the width of the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [ButtonWidthTypes](../../Button.types.ts) or number                  | No                                                      |      ButtonWidthTypes.Auto                                                   |

## Usage

```javascript
<ButtonPrimary
  label={SAMPLE_LABEL}
  startIconName={IconName.Bank}
  endIconName={IconName.Bank}
  size={ButtonSize.Md}
  onPress={SAMPLE_ONPRESS_HANDLER}
  isDanger
  width={ButtonWidthTypes.Auto}
/>;
```
