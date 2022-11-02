# AvatarImage

AvatarImage is a component that renders an image contained within an avatar.

## Props

This component extends [AvatarBaseProps](../../foundation/AvatarBase/AvatarBase.types.ts) from the [AvatarBase](../../foundation/AvatarBase/AvatarBase.tsx) component and the ImagePropBase from ReactNative's [Image](https://reactnative.dev/docs/images) component.

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

## Usage

```javascript
const imageSource:ImageSourcePropType = {
    uri: SAMPLE_IMAGE_URI
}
<AvatarImage size={AvatarSizes.Md} source={imageSource} isHaloEnabled backgroundColor={'#000000'}/>;
```

