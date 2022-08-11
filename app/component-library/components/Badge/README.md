# Badge

Badge is a wrapper component that enables any custom component to be attached to a child component.

## Props

This component extends `ViewProps` from React Native's [View Component](https://reactnative.dev/docs/view).

### `badgeContent`

Any given component to be placed within the badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                              | Yes                                                     |

### `children`

Any given component for the badge to attach itself to.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                              | Yes                                                     |

### `badgeContentStyle`

Optional style opject that can be passed to the badge content.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [StyleProp]([./AvatarBase.types.ts#L17](https://reactnative.dev/docs/view-style-props))          | No                                                     |

## Usage

```javascript
// Change import path to relative path.
import Badge from 'app/component-library/components/Badge';

<Badge badgeContent={SAMPLE_BADGE_CONTENT}>
    <Tag label={'Children'} />
</Badge>,
```