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
// Change import path to relative path.
import BadgeWrapper from 'app/component-library/components/Badges/BadgeWrapper';
import AvatarAccount from 'app/component-library/components/Avatars/Avatar/variants/AvatarAccount';

<BadgeWrapper badgeProps={BADGE_PROPS}>
  <AvatarAccount accountAddress={ACCOUNT_ADDRESS} />
</BadgeWrapper>;
```
