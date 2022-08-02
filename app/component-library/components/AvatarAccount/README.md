# AvatarAccount

AvatarAccount is a component that renders an avatar based on the users account address.

## Props

This component extends the [Avatar](../Avatar/Avatar.tsx) component.

### `type`

Optional enum to select the avatar type between `JazzIcon` and `Blockies`.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [AvatarAccountType](./AvatarAccount.types.ts#L2)    | Yes                                                     | JazzIcon                                               |

### `accountAddress`

An Ethereum wallet address.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |
