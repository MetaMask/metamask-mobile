# [BadgeStatus](https://www.notion.so/MetaMask-Design-System-Guides-Design-f86ecc914d6b4eb6873a122b83c12940?p=5caf000de32549f8ad67c0b89469ce4d&pm=c)

![BadgeStatus](./BadgeStatus.png)

BadgeStatus is used on top of an element to display status information. **This component is not meant to be used by itself**. It is used by [BadgeWrapper](../BadgeWrapper/BadgeWrapper.tsx), which can render this component as a badge.

## Props

This component extends [BadgeBaseProps](../../foundation/BadgeBase/BadgeBase.types.ts).

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
