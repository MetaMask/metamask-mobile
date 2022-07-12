# Toast

Toast is a component that slides up from the bottom. Typically used to show post confirmation information.

## Props

This component extends `TouchableOpacityProps` from React Native's [View Component](https://reactnative.dev/docs/touchableOpacity).

### `label`

Button text.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `labelColor`

Color of label. Applies to icon too.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | No                                                      |

### `size`

Enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BaseButtonSize](./BaseButton.types.ts#L4)          | Yes                                                     |

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
