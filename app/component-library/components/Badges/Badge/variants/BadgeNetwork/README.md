# BadgeNetwork

BadgeNetwork is a component that shows the network image as a badge. **This component is not meant to be used by itself**. It is used by [BadgeWrapper](../BadgeWrapper/BadgeWrapper.tsx), which can render this component as a badge.

## Props

This component extends `ViewProps` from React Native's [View](https://reactnative.dev/docs/view) component.

### `variant`

Variant of badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeVariants.Network](../../Badge.types.ts#L7)                                           | Yes                                                     |

### `name`

Name of the network.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `imageSource`

Image of the network from either a local or remote source.

| <span style="color:gray;font-size:14px">TYPE</span>                   | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------------------------- | :------------------------------------------------------ |
| [ImageSourcePropType](https://reactnative.dev/docs/image#imagesource) | Yes                                                     |

### `position`

Optional enum that represents the position of the network badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [BadgeNetworkPosition](./BadgeNetwork.types.ts#L11)  | No                                                      | TopRight                                               |

## Usage

```javascript
// Change import path to relative path.
import BadgeNetwork from 'app/component-library/components/Badges/variant/BadgeNetwork';
import {BadgeVariants} from 'app/component-library/components/Badges/Badge.types';

<BadgeNetwork
  variant={BadgeVariants.Network}
  name={NETWORK_NAME}
  imageSource={NETWORK_IMAGE_SOURCE}
  position={BadgeNetworkPosition.TopRight}
/>;
```
