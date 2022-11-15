# AvatarJazzIcon

AvatarJazzIcon is a component that renders an avatar with a JazzIcon image based on an address.

## Props

This component extends [CirclePatternProps](../../../../../patterns/Circles/Circle/Circle.types.ts) from [CirclePattern](../../../../../patterns/Circles/Circle/Circle.tsx) component.

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

### `jazzIconProps`

Props for the JazzIcon content.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IJazziconProps](https://www.npmjs.com/package/react-native-jazzicon)                                              | Yes                                                     |

## Usage

```javascript
const badgeProps = {
  variant: BadgeVariants.Network,
  networkProps: {
    name: SAMPLE_NETWORK_NAME,
    imageProps: {
      source: SAMPLE_NETWORK_IMG_SOURCE,
    }
  }
}

const jazzIconProps = {
  address: SAMPLE_JAZZICON_ADDRESS,
}

<AvatarJazzIcon 
  size={AvatarSizes.Md}
  jazzIconProps={jazzIconProps}
  badgeProps={badgeProps}
  badgePosition={AvatarBadgePositions.BottomRight}/>;
```
