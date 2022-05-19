# AccountAvatar

AccountAvatar is a component that renders an avatar based on the users account address. This component is based on the [BaseAvatar](../BaseAvatar/BaseAvatar.tsx) component.

## Props

This component extends [BaseAvatarProps](../BaseAvatar/BaseAvatar.types.ts#L17) from `BaseAvatar` component.

### `size`

Enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span>    | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :----------------------------------------------------- | :------------------------------------------------------ |
| [BaseAvatarSize](../BaseAvatar/BaseAvatar.types.ts#L6) | Yes                                                     |

### `type`

Enum to select the avatar type between `JazzIcon` and `Blockies`.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [AccountAvatarType](./AccountAvatar.types.ts#L2)    | Yes                                                     |

### `accountAddress`

An Ethereum wallet address.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| String                                              | Yes                                                     |
