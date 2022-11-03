# BadgeWrapper

BadgeWrapper is a wrapper component that attaches a [Badge](./Badge/Badge.tsx) on top of any component.

## Props

This component extends `ViewProps` from React Native's [View](https://reactnative.dev/docs/view) component.

### `badgeProps`

Props for the [Badge](../Badge/Badge.tsx) component.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeProps](../Badge/Badge.types.ts)                                           | Yes                                                     |

### `children`

The children element that the badge will attach itself to.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| React.ReactNode                                     | Yes                                                     |

## Usage

```javascript
const avatarProps: AvatarProps = {
  variant: AvatarVariants.Initial,
  size: AvatarSizes.Md,
  initial: 'Morph',
  backgroundColor :'#000000'
}

const badgeProps: BadgeProps = {
  variant: BadgeVariants.Avatar,
  avatarProps
}

<BadgeWrapper badgeProps={badgeProps}>
  <AvatarInitial initial='Sample' />
</BadgeWrapper>;
```
