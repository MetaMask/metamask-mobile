# BadgeWrapper

BadgeWrapper is a wrapper component that attaches a [Badge](./Badge/Badge.tsx) on top of any component.

## Props

This component extends `ViewProps` from React Native's [View](https://reactnative.dev/docs/view) component.

### `anchorElementShape`

Optional prop to control the shape of the element the badge will anchor to.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [BadgeAnchorElementShape](./BadgeWrapper.types.ts)  | No                                                      | Disconnected                                               |

### `badgePosition`

Optional prop to control the position of the badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [BadgePosition](./BadgeWrapper.types.ts) or [BadgePositionObj](./BadgeWrapper.types.ts)            | No                                                      | TopRight                                               |

### `children`

The children element that the badge will attach itself to.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| React.ReactNode                                     | Yes                                                     |

### `badgeElement`

Any element that will be placed in the position of the badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| React.ReactNode                                     | Yes                                                     |

## Usage

```javascript
<BadgeWrapper 
  anchorElementShape={BadgeAnchorElementShape.Circular}
  badgePosition={BadgePosition.TopRight}
  badge={SAMPLE_BADGE_ELEMENT}>
  <View/>
</BadgeWrapper>;
```
