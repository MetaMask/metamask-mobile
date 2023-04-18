# BadgeStatus

BadgeStatus is used on top of an element to display status information. **This component is not meant to be used by itself**. It is used by [BadgeWrapper](../BadgeWrapper/BadgeWrapper.tsx), which can render this component as a badge.

## Props

This component extends [BadgeBaseProps](../../foundation/BadgeBase/BadgeBase.types.ts).

### `variant`

Optional prop to control the variant of badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeVariant.Status](../../Badge.types.ts)                                           | Yes                                                     |

### `state`

Optional prop to control the status of BadgeStatus.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [BadgeStatusState](./BadgeStatus.types.ts)  | No                                                      | Disconnected                                               |

### `borderColor`

Optional prop to change the color of the border.

| <span style="color:gray;font-size:14px">TYPE</span>                   | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------------------------- | :------------------------------------------------------ |
| ColorValue                                            | No                                                     |

## Usage

```javascript
<BadgeStatus
  variant={BadgeVariant.Status}
  state={BadgeStatusState.Disconnected}
/>;
```
