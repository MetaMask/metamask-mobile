# BadgeBase

BadgeBase is a base component for all Badges.

## Props

This component extends `ViewProps` from React Native's [View](https://reactnative.dev/docs/view) component.

### `children`

Any given component to be placed within the badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | Yes                                                     |

## Usage

```javascript
import BadgeBase from '#app/component-library/components/Badges/Badge/foundation/BadgeBase';
import Tag from '#app/component-library/components/Tags/Tag';

<BadgeBase>
    <Tag label={'Children'} />
</BadgeBase>,
```
