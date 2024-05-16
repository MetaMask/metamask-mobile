BadgeNotifications is used on top of an element to display notifications information. **This component is not meant to be used by itself**. It is used by [BadgeWrapper](../BadgeWrapper/BadgeWrapper.tsx), which can render this component as a badge.

## Props

This component extends [BadgeBaseProps](../../foundation/BadgeBase/BadgeBase.types.ts).

### `iconName`

Required prop for icon names used by the notifications.

| <span style="color:gray;font-size:14px">TYPE</span>  | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :--------------------------------------------------- | :------------------------------------------------------ |
| [IconName](../../../../Icons/Icon/Icon.types.ts#L50) | Yes                                                     |

## Usage

```javascript
<BadgeNotifications
  variant={BadgeVariant.Notifications}
  iconName={NETWORK_NAME}
/>
```
