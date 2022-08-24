# Badge

Badge is a union component, which currently only consist of [BadgeNetwork](./variants/BadgeNetwork/BadgeNetwork.tsx)

## Common Props

### `variant`

Variant of badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeVariants](../../Badge.types.ts#L7)                                           | Yes                                                     |

## BadgeNetwork Props

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
import Badge from 'app/component-library/components/Badges/Badge';
import {BadgeVariants} from 'app/component-library/components/Badges/Badge.types';

<Badge
  variant={BadgeVariants.Network}
  name={NETWORK_NAME}
  imageSource={NETWORK_IMAGE_SOURCE}
  position={BadgeNetworkPosition.TopRight}
/>;
```
