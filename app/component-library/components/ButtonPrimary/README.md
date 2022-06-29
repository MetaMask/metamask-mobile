# ButtonPrimary

ButtonPrimary is used for primary call to actions.

## Props

This component extends `ViewProps` from React Native's [View Component](https://reactnative.dev/docs/view).

### `label`

Button text.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `size`

Enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span>    | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :----------------------------------------------------- | :------------------------------------------------------ |
| [BaseButtonSize](../BaseButton/BaseButton.types.ts#L4) | Yes                                                     |

### `onPress`

Function to trigger when pressing the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | Yes                                                     |

### `iconName`

Icon to use.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconName](../Icon/Icon.types.ts#53)                | False                                                   |

### `variant`

Enum use to select between variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [ButtonPrimaryVariant](./ButtonPrimary.types.ts#L7) | Yes                                                     |
