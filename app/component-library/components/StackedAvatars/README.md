# StackedAvatars

StackedAvatars is a component that renders horizontally an array of token avatars. Only the first four will render until an overflow counter appears. This component is based on the [BaseAvatar](../BaseAvatar/BaseAvatar.tsx) component.

## Props

This component extends [BaseAvatarProps](../BaseAvatar/BaseAvatar.types.ts#L17) from `BaseAvatar` component.

### `tokenList`

A list of tokens metadata to be horizontally stacked

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [AvatarList](./StackedAvatars.types.ts#L16)         | Yes                                                     |
