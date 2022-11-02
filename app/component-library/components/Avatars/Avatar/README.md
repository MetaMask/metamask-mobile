# Avatar

This component is a union Avatar component, which consists of [AvatarIcon](./variants/AvatarIcon/AvatarIcon.tsx), [AvatarImage](./variants/AvatarImage/AvatarImage.tsx), and [AvatarInitial](./variants/AvatarInitial/AvatarInitial.tsx)

## Common props

### `variant`

Variant of Avatar.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [AvatarVariants](./Avatar.types.ts)                                              | Yes                                                     |

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

## AvatarIcon props

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

## AvatarImage props

### `isHaloEnabled`

Optional boolean to activate halo effect.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean          | No                                                     | false                                                     |

### `source`

The image source (either a remote URL or a local file resource). 
The currently supported formats are png, jpg, jpeg, bmp, gif, webp (Android only), psd (iOS only).

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [ImageSourcePropType](https://reactnative.dev/docs/images)                                              | Yes                                                      |

## AvatarInitial props

### `initial`

An initial to be displayed in the Avatar.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                      |

## Usage

```javascript
<Avatar variant={AvatarVariants.Icon} size={AvatarSizes.Md} name={IconName.BankFilled} backgroundColor={'#000000'}/>;
<Avatar variant={AvatarVariants.Image} size={AvatarSizes.Md} source={imageSource} isHaloEnabled backgroundColor={'#000000'}/>;
<Avatar variant={AvatarVariants.Initial} size={AvatarSizes.Md} initial={'Morph'} backgroundColor={'#000000'}/>;
```

