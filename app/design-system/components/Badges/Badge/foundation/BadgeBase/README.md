# BadgeBase

BadgeBase is a base component for all Badges.

## Props

This component extends `ViewProps` from React Native's [View](https://reactnative.dev/docs/view) component.

### `children`

Any given component to be placed within the badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                              | Yes                                                     |

## Usage

```javascript
// Change import path to relative path.
import BadgeBase from 'app/design-system/components/Badges/foundation/BadgeBase';
import Tag from 'app/design-system/components/Tags/Tag';

<BadgeBase>
    <Tag label={'Children'} />
</BadgeBase>,
```