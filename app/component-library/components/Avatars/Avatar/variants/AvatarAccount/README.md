# AvatarAccount

AvatarAccount is a component that renders an avatar based on the users account address.

## Props

This component extends [AvatarBaseProps](../AvatarBase/AvatarBase.types.ts#L17) from [AvatarBase](../Avatar/Avatar.tsx) component.

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

## Usage

```javascript
// Replace import with relative path.
import AvatarAccount, {
  AvatarAccountType,
} from 'app/component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from 'app/component-library/components/Avatars/Avatar/Avatar';

<AvatarAccount
  type={AvatarAccountType.Jazzicon}
  accountAddress={ACCOUNT_ADDRESS}
  size={AvatarSize.Md}
/>;
```
