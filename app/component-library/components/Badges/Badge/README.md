# Badge

Badge is a union component, which currently only consist of [BadgeAvatar](./variants/BadgeAvatar/BadgeAvatar.tsx)

## Common Props

### `variant`

Variant of badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeVariants](../../Badge.types.ts)                                           | Yes                                                     |

## BadgeAvatar Props

### `avatarProps`

Props for the avatarContent.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [AvatarProps](../../../../Avatars/Avatar/Avatar.types.ts)                                              | Yes                                                     |

## Usage

```javascript
const avatarProps: AvatarProps = {
  variant: AvatarVariants.Initial,
  size: AvatarSizes.Md,
  initial: 'Morph',
  backgroundColor :'#000000'
}

<Badge
  variant={BadgeVariants.Avatar}
  avatarProps={avatarProps}
/>;
```