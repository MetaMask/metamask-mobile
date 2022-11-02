# AvatarIcon

AvatarIcon is a component that renders an icon contained within an avatar.

## Props

This component extends [AvatarBaseProps](../../foundation/AvatarBase/AvatarBase.types.ts) from the [AvatarBase](../../foundation/AvatarBase/AvatarBase.tsx) component and the [IconProps](../../../../Icon/Icon.types.ts) from the [Icon](../../../../Icon/Icon.tsx) component, with the exception of [IconSizes](../../../../Icon/Icon.types.ts), which is determined by the [AvatarSizes](../../Avatar.types.ts). The mapping for the [AvatarSizes](../../Avatar.types.ts) to the [IconSizes](../../../../Icon/Icon.types.ts) can be found at [AvatarIcon.constants](./AvatarIcon.constants.ts).

### `size`

Optional enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [AvatarSizes](../../Avatar.types.ts)          | No                                                     | Md                                                     |

### `backgroundColor`

Optional enum to add color to the background of the Avatar.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [Color](../../../../../constants/typescript.constants.ts) or 'default'          | No                               |'default'                                                     |

### `name`

Name of icon to use.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconName](../../../../Icon/Icon.types.ts)               | Yes                                                     |

### `color`

Color to apply to the icon. Defaults to `icon.default` from theme.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | No                                                      |

## Usage

```javascript
<AvatarIcon size={AvatarSizes.Md} name={IconName.BankFilled} backgroundColor={'#000000'}/>;
```

