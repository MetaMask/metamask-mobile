# BadgeWrapper

BadgeWrapper is a wrapper component that attaches a [Badge](./Badge/Badge.tsx) on top of any component.

## Props

This component extends `ViewProps` from React Native's [View](https://reactnative.dev/docs/view) component. Props are also based on the union `type` of [BadgeProps](../Badge/Badge.types.ts#L1).

### `type`

Type of the badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| `network`                                           | Yes                                                     |

### `children`

Element to wrap and to apply a badge component.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| React.ReactNode                                     | Yes                                                     |

### `...props`

Badge props is based on the union `type` of `BadgeProps`.

| <span style="color:gray;font-size:14px">TYPE</span>     | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :------------------------------------------------------ | :------------------------------------------------------ |
| [BadgeProps](../BadgeNetwork/BadgeNetwork.types.ts#L15) | Yes                                                     |

## Usage

```javascript
// Change import path to relative path.
import BadgeWrapper from 'app/component-library/components/Badges/BadgeWrapper';
import AvatarAccount from 'app/component-library/components/Avatars/AvatarAccount';

<BadgeWrapper
  type={'network'}
  name={NETWORK_NAME}
  imageSource={NETWORK_IMAGE_SOURCE}
  position={BadgeNetworkPosition.TopRight}
>
  <AvatarAccount accountAddress={ACCOUNT_ADDRESS} />
</BadgeWrapper>;
```
