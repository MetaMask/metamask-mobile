# AvatarBase

The AvatarBase component is a base component of the [Avatar](../../Avatar.tsx). It contains all the shared configurations and styling amongst all Avatar variants and **should not be used unless creating a new type of Avatar**.

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
| [AvatarBadgePositions](../../Avatar.types.ts)          | No                                                     | [AvatarBadgePositions.TopRight](../../Avatar.types.ts)                                        |

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
<AvatarBase 
  size={AvatarSizes.Md}
  badgeProps={badgeProps}
  badgePosition={AvatarBadgePositions.BottomRight}>
    <SAMPLE_COMPONENT />
</AvatarBase>;
```
