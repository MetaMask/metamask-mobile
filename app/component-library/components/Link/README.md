# Link

Link is a component that we use for accessing external links or navigating to other places in the app. This component is based on the [BaseText](../BaseText/BaseText.types.ts) component.

## Props

This component extends `TextProps` from React Native's [Text Component](https://reactnative.dev/docs/text).

### `variant`

Enum to select between Typography variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BaseTextVariant](../BaseText/BaseText.types.ts#L6) | Yes                                                     |

### `onPress`

Function to trigger when pressing the link.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | Yes                                                     |
