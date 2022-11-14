# Network

Network is a component that renders a network image based on the user selected network.

## Props

This component extends [CirclePatternProps](../../../patterns/Circles/Circle/Circle.types.ts) from [CirclePattern](../../../patterns/Circles/Circle/Circle.tsx) component.

### `size`

Optional enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [NetworkSizes](./Network.types.ts)          | No                                                     | Md                                                     |

### `badgeProps` 

Optional enum for the Badge props.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeProps](../../Badges/Badge/Badge.types.ts)                                      | No                                                     |

### `badgePosition`

Optional enum to set the position for the Badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [NetworkBadgePositions](./Network.types.ts)          | No                                                     | TopRight                                        |

### `imageProps`

Props for the image content rendered inside the AvatarImage.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [ImagePropsBase](https://reactnative.dev/docs/images)                                              | Yes                                                      |

### `name`

Optional network name.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                                | No                                                      |

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

<Network 
  size={NetworkSizes.Md}
  name={SAMPLE_NETWORK_NAME}
  imageProps={imageProps}
  badgeProps={badgeProps}
  badgePosition={NetworkBadgePositions.BottomRight}/>;
/>;
```
