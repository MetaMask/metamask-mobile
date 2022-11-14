# Avatar

Avatar is graphical representation of **an account**: usually a photo, illustration, or initial.
This component is a union Avatar component, which consists of [AvatarBlockies](./variants/AvatarBlockies/AvatarBlockies.tsx), [AvatarImage](./variants/AvatarImage/AvatarImage.tsx), [AvatarInitial](./variants/AvatarInitial/AvatarInitial.tsx), and [AvatarJazzIcon](./variants/AvatarJazzIcon/AvatarJazzIcon.tsx)

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
| [AvatarSizes](./Avatar.types.ts)          | No                                                     | Md                                                     |

### `badgeProps` 

Optional enum for the Badge props.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeProps](../../Badges/Badge/Badge.tsx)                                      | No                                                     |

### `badgePosition`

Optional enum to set the position for the Badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [AvatarBadgePositions](./Avatar.types.ts)          | No                                                     | TopRight

## AvatarBlockies props

### `accountAddress`

An Ethereum wallet address.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

## AvatarImage props

### `imageProps`

Props for the image content rendered inside the AvatarImage.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [ImagePropsBase](https://reactnative.dev/docs/images)                                              | Yes                                                      |

## AvatarInitial props

### `initial`

An initial to be displayed in the Avatar.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                      |

### `initialColor`

Optional enum to add color to the initial text.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ColorValue                                              | No                                                     |

### `backgroundColor`

Optional enum to add color to the background of the Avatar.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ColorValue                                              | No                                                     |

## AvatarJazzIcon props

### `jazzIconProps`

Props for the JazzIcon content.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IJazziconProps](https://www.npmjs.com/package/react-native-jazzicon)                                              | Yes                                                     |

## Usage

```javascript
const imageProps = {
    source: {
        uri: SAMPLE_IMAGE_URI
    }
}
const badgeProps = {
  variant: BadgeVariants.Network,
  networkProps: {
    name: SAMPLE_NETWORK_NAME,
    imageProps: imageProps,
  }
}

const jazzIconProps = {
  address: SAMPLE_JAZZICON_ADDRESS,
}

// Avatar Blockies
<Avatar
  variant={AvatarVariants.Blockies}
  size={AvatarSizes.Md}
  accountAddress={SAMPLE_ACCOUNT_ADDRESS}
  badgeProps={badgeProps}
  badgePosition={AvatarBadgePositions.BottomRight}/>;

// Avatar Image
<Avatar
  variant={AvatarVariants.Image}
  size={AvatarSizes.Md}
  imageProps={imageProps}
  badgeProps={badgeProps}
  badgePosition={AvatarBadgePositions.BottomRight}/>

// Avatar Initial
<Avatar
  variant={AvatarVariants.Initial}
  size={AvatarSizes.Md}
  initial={'Morph'} 
  initialColor={'#FFFFFF'}
  backgroundColor={'#000000'}
  badgeProps={badgeProps}
  badgePosition={AvatarBadgePositions.BottomRight}/>

// Avatar JazzIcon
<Avatar 
  variant={AvatarVariants.JazzIcon}
  size={AvatarSizes.Md}
  jazzIconProps={jazzIconProps}
  badgeProps={badgeProps}
  badgePosition={AvatarBadgePositions.BottomRight}/>;
```

