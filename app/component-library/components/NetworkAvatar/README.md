# NetworkAvatar

NetworkAvatar is a component that renders an avatar based on the user selected network. This component is based on the [BaseAvatar](../BaseAvatar/BaseAvatar.tsx) component.

## Props

This component extends [BaseAvatarProps](../BaseAvatar/BaseAvatar.types.ts#L17) from `BaseAvatar` component.

### `size`

Enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span>    | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :----------------------------------------------------- | :------------------------------------------------------ |
| [BaseAvatarSize](../BaseAvatar/BaseAvatar.types.ts#L6) | Yes                                                     |

### `networkName`

Chain name 

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [networkName](./NetworkAvatar.types.ts#L11)         | No                                                      |

### `networkImageUrl`

Chain image URL

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [networkImageUrl](./NetworkAvatar.types.ts#L15)     | No                                                      |

