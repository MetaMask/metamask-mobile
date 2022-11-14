# AvatarImage

AvatarImage is a component that renders an avatar with an image as the content.

## Props

This component extends [AvatarBaseProps](../../foundation/AvatarBase/AvatarBase.types.ts) from [AvatarBase](../../foundation/AvatarBase/AvatarBase.tsx) component.

### `size`

Optional enum to select between size variants. 

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [AvatarSizes](../../Avatar.types.ts)          | No                                                     | Md                                                     |

### `badgeProps` 

Optional enum for the Badge props.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeProps](../../../../Badges/Badge/Badge.types.ts)                                      | No                                                     |

### `badgePosition`

Optional enum to set the position for the Badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [AvatarBadgePositions](../../Avatar.types.ts)          | No                                                     | TopRight                                        |

### `imageProps`

Props for the image content rendered inside the AvatarImage.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [ImagePropsBase](https://reactnative.dev/docs/images)                                              | Yes                                                      |

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
    imageProps: {
      source: SAMPLE_NETWORK_IMG_SOURCE,
    }
  }
}

<AvatarImage 
  size={AvatarSizes.Md}
  imageProps={imageProps}
  badgeProps={badgeProps}
  badgePosition={AvatarBadgePositions.BottomRight}/>;
```

