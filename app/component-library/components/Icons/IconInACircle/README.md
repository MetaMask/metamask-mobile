# IconInACircle

IconInACircle is a component that renders an icon contained in a circle.

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

### `iconProps`

Props for the icon content

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconProps](../Icon/Icon.types.ts)                                              | Yes                                                      |

### `backgroundColor`

Optional enum to add color to the background of the IconInACircle.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ColorValue                                              | No                                                     |

## Usage

```javascript
<IconInACircle size={AvatarSizes.Md} name={IconName.BankFilled} backgroundColor={'#000000'}/>;
```

