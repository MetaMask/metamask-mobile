# AvatarAccount

AvatarAccount is a component that renders an avatar based on the users account address.

## Props

This component extends [AvatarBaseProps](../../foundation/AvatarBase/AvatarBase.types.ts) from [AvatarBase](../../foundation/AvatarBase/AvatarBase.tsx) component.

### `size`

Optional enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [AvatarSizes](../../Avatar.types.ts)          | No                                                     | Md                                                     |

### `backgroundColor`

Optional enum to add color to the background of the Avatar.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ColorValue                                              | No                                                     |

### `isBadgeIncluded`

Optional boolean to select if badge should be included.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                   | No                                                     | false                                                     |

### `badgeProps`

Optional enum for the Badge props.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeProps](../../../../../../Badges/Badge/Badge.types.ts)                                      | No                                                     |

### `badgePosition`

Optional enum to set the position for the Badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [AvatarBadgePositions](../../Avatar.types.ts)          | No                                                     | [AvatarBadgePositions.TopRight](../../Avatar.types.ts)                                        |

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
const avatarProps: AvatarProps = {
  variant: AvatarVariants.JazzIcon,
  size: AvatarSizes.Md,
  address: SAMPLE_JAZZICON_ADDRESS,
  backgroundColor :'#000000'
}
const badgeProps: BadgeProps = {
  variant: BadgeVariants.Avatar,
  avatarProps
}

<AvatarAccount 
  size={AvatarSizes.Md}
  backgroundColor={'#000000'}
  isBadgeIncluded
  badgeProps={badgeProps}
  badgePosition={AvatarBadgePositions.BottomRight}
  type={AvatarAccountType.Jazzicon}
  accountAddress={SAMPLE_ACCOUNT_ADDRESS}/>;
```
