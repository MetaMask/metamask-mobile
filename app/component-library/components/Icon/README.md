# Icon

Icon is a component which is used to render icons from our icon set.

## Props

This component extends `ViewProps` from React Native's [View Component](https://reactnative.dev/docs/view).

### `size`

Enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span>    | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :----------------------------------------------------- | :------------------------------------------------------ |
| [BaseAvatarSize](../BaseAvatar/BaseAvatar.types.ts#L6) | Yes                                                     |

### `name`

Icon to use.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconName](./Icon.types.ts#L53)                     | Yes                                                     |

### `color`

Color to apply to the icon. Defaults to `icon.default` from theme.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | No                                                      |
