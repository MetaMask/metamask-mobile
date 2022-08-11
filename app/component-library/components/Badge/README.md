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

### `position`

Optional placement position of the badge relative to the children. The value can either be a preset position, or a custom positioning object

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [BadgePositionVariant](./Badge.types.ts#L6) / [BadgeCustomPosition](./Badge.types.ts#L11)          | No                                                     | TopRight                                                     |

## Usage

```javascript
// Change import path to relative path.
import Badge from 'app/component-library/components/Badge';
import Tag from 'app/component-library/components/Tags/Tag';

const badgeContent = <Tag label={'Badge'} />;
<Badge badgeContent={badgeContent}>
    <Tag label={'Children'} />
</Badge>,
```