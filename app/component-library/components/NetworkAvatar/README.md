# NetworkAvatar

NetworkAvatar is a component that renders an avatar based on the user selected network. This component is based on the [BaseAvatar](../BaseAvatar/BaseAvatar.tsx) component.

## Props

This component extends [BaseAvatarProps](../BaseAvatar/BaseAvatar.types.ts#L17) from `BaseAvatar` component.

### `size`

Enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span>    | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :----------------------------------------------------- | :------------------------------------------------------ |
| [BaseAvatarSize](../BaseAvatar/BaseAvatar.types.ts#L6) | Yes                                                     |

### `chainId`


| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [NetworksChainId](https://github.com/MetaMask/controllers/blob/main/src/network/NetworkController.ts#L23)    | Yes                                                     |

