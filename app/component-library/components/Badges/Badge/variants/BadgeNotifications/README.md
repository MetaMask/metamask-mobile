# [BadgeNotifications](https://metamask-consensys.notion.site/Badge-Notifications-94a679c50cb446f4844dc624b4f74946)

![BadgeNotifications](./BadgeNotifications.png)

BadgeNotifications is used on top of an element to display notifications information. **This component is not meant to be used by itself**. It is used by [BadgeWrapper](../BadgeWrapper/BadgeWrapper.tsx), which can render this component as a badge.

## Props

This component extends [BadgeBaseProps](../../foundation/BadgeBase/BadgeBase.types.ts).

### `name`

Optional prop for name of the notifications.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `iconName`

Optional prop to control the icon source name of the notifications from local source.

| <span style="color:gray;font-size:14px">TYPE</span>                | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :----------------------------------------------------------------- | :------------------------------------------------------ | --- |
| [iconNamePropType](https://reactnative.dev/docs/image#imagesource) | Yes                                                     |     |

## Usage

```javascript
<BadgeNotifications
  variant={BadgeVariant.Notifications}
  iconName={NETWORK_NAME}
/>
```
