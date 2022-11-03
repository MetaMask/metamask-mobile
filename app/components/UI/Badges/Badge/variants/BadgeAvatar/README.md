# BadgeAvatar

BadgeAvatar is a component that shows the network image as a badge. **This component is not meant to be used by itself**. It is used by [BadgeWrapper](../BadgeWrapper/BadgeWrapper.tsx), which can render this component as a badge.

## Props

This component extends `ViewProps` from React Native's [View](https://reactnative.dev/docs/view) component.

### `variant`

Variant of badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeVariants.Avatar](../../Badge.types.ts)                                           | Yes                                                     |

### `avatarProps`

Enum for the Avatar props.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [AvatarProps](../../../../Avatars/Avatar/Avatar.types.ts)                                      | Yes                                                     |

## Usage

```javascript
const avatarProps: AvatarProps = {
  variant: AvatarVariants.JazzIcon,
  size: AvatarSizes.Md,
  address: SAMPLE_JAZZICON_ADDRESS,
  backgroundColor :'#000000'
}
<BadgeAvatar avatarProps={avatarProps}
/>;
```
