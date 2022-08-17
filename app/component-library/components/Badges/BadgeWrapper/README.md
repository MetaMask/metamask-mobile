# BadgeWrapper

BadgeWrapper is a wrapper component that attaches a [Badge](./Badge/Badge.tsx) on top of any component.

## Props

This component extends `ViewProps` from React Native's [View](https://reactnative.dev/docs/view) component.

### `badgeProps`

Props for the badge itself.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeProps](../Badge/Badge.types.ts)                                           | Yes                                                     |

### `children`

Element to wrap and to apply a badge component.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| React.ReactNode                                     | Yes                                                     |

## Usage

```javascript
// Change import path to relative path.
import BadgeWrapper from 'app/component-library/components/Badges/BadgeWrapper';
import AvatarAccount from 'app/component-library/components/Avatars/AvatarAccount';

<BadgeWrapper badgeProps={BADGE_PROPS}>
  <AvatarAccount accountAddress={ACCOUNT_ADDRESS} />
</BadgeWrapper>;
```
