# CirclePattern

The CirclePattern component is pattern for any component that looks and behave like a circle. Components that use this pattern includes [Avatar](../../../components/Avatars/Avatar/Avatar.tsx), [Token](../../../components/Tokens/Token/Token.tsx), [Network](../../../components/Networks/Network/Network.tsx), and many more. This pattern **should not be used unless creating a new component that needs this pattern.**

## Props

This component extends [ViewProps](https://reactnative.dev/docs/view-style-props) from React Native's [View](https://reactnative.dev/docs/view) component.

### `size`

Optional enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [CirclePatternSizes](Circle.types.ts)          | No                                                     | Md                                                     |

### `badgeProps` 

Optional enum for the Badge props.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeProps](../../../components/Badges/Badge/Badge.types.ts)                                      | No                                                     |

### `badgePosition`

Optional enum to set the position for the Badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [CirclePatternBadgePositions](./Circle.types.ts)          | No                                                     | TopRight                                        |

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
<CirclePattern 
  size={AvatarSizes.Md}
  badgeProps={badgeProps}
  badgePosition={CirclePatternBadgePositions.BottomRight}>
    <SAMPLE_COMPONENT />
</CirclePattern>;
```
