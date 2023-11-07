# Button

Buttons allow users to take actions, and make choices, with a single tap.
This component is a union component, which consists of [ButtonLink](./variants/ButtonLink/ButtonLink.tsx), [ButtonPrimary](./variants/ButtonPrimary/ButtonPrimary.tsx), and [ButtonSecondary](./variants/ButtonSecondary/ButtonSecondary.tsx).

## ButtonLink Props

### `textVariant`

Optional props to configure text component variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [TextVariant](../../../../Texts/Text/Text.types.ts)                                              | No                                                     |

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
// ButtonLink
<Button
  variant={ButtonVariants.Link}
  label={SAMPLE_LABEL}
  startIconName={IconName.Bank}
  endIconName={IconName.Bank}
  size={ButtonSize.Md}
  onPress={SAMPLE_ONPRESS_HANDLER}
  isDanger
  width={ButtonWidthTypes.Auto}
  textVariant={TextVariant.DisplayMD}
/>;

// ButtonPrimary
<Button
  variant={ButtonVariants.Primary}
  label={SAMPLE_LABEL}
  startIconName={IconName.Bank}
  endIconName={IconName.Bank}
  size={ButtonSize.Md}
  onPress={SAMPLE_ONPRESS_HANDLER}
  isDanger
  width={ButtonWidthTypes.Auto}
/>;

// ButtonSecondary
<Button
  variant={ButtonVariants.Secondary}
  label={SAMPLE_LABEL}
  startIconName={IconName.Bank}
  endIconName={IconName.Bank}
  size={ButtonSize.Md}
  onPress={SAMPLE_ONPRESS_HANDLER}
  isDanger
  width={ButtonWidthTypes.Auto}
/>;
```
