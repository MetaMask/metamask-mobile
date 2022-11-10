# BadgeAvatar

BadgeAvatar is a component that shows the avatar as a badge. **This component is not meant to be used by itself**. It is used by [BadgeWrapper](../../../BadgeWrapper/BadgeWrapper.tsx), which can render this component as a badge.

## Props

This component extends [BadgeBaseProps](../../foundation/BadgeBase/BadgeBase.types.ts) from the [BadgeBase](../../foundation/BadgeBase/BadgeBase.tsx) component.

### `variant`

Variant of badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeVariants.Avatar](../../Badge.types.ts)                                           | No                                                     |

### `avatarProps`

Props for the avatarContent.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [AvatarProps](../../../../Avatars/Avatar/Avatar.types.ts)                                              | Yes                                                     |


## Usage

```javascript
const avatarProps: AvatarProps = {
  variant: AvatarVariants.Initial,
  size: AvatarSizes.Md,
  initial: 'Morph',
  backgroundColor :'#000000'
}

<BadgeAvatar avatarProps={avatarProps} />;
```
