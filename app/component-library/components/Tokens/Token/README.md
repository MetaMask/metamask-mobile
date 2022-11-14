# Token

Token is an image component that renders a token or tradable assets.

## Props

This component extends [CirclePatternProps](../../../patterns/Circles/Circle/Circle.types.ts) from [CirclePattern](../../../patterns/Circles/Circle/Circle.tsx) component.

### `size`

Optional enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [TokenSizes](./Token.types.ts)          | No                                                     | Md                                                     |

### `badgeProps` 

Optional enum for the Badge props.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeProps](../../Badges/Badge/Badge.types.ts)                                      | No                                                     |

### `badgePosition`

Optional enum to set the position for the Badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [TokenBadgePositions](./Token.types.ts)          | No                                                     | TopRight                                        |

### `imageProps`

Props for the image content rendered inside the AvatarImage.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [ImagePropsBase](https://reactnative.dev/docs/images)                                              | Yes                                                      |

### `name`

Optional token name.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                                | No                                                      |

### `isHaloEnabled`

Boolean value that activates halo effect (blurred image colors around).

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| boolean                                                | true                                                      |

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

<Token 
  size={TokenSizes.Md}
  name={SAMPLE_TOKEN_NAME}
  isHaloEnabled
  imageProps={imageProps}
  badgeProps={badgeProps}
  badgePosition={TokenBadgePositions.BottomRight}/>;
```
