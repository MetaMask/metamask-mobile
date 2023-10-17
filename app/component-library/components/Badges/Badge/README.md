# Badge

Badge is a union component, which currently only consist of [BadgeNetwork](./variants/BadgeNetwork/BadgeNetwork.tsx)

## Common Props

### `variant`

Variant of badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeVariant](../../Badge.types.ts)                                           | Yes                                                     |

## BadgeNetwork Props

### `name`

Optional prop for name of the network.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `imageSource`

Optional prop to control the image source of the network from either a local or remote source.

| <span style="color:gray;font-size:14px">TYPE</span>                   | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------------------------- | :------------------------------------------------------ |
| [ImageSourcePropType](https://reactnative.dev/docs/image#imagesource) | Yes                                                     |                                      |

## BadgeStatus Props

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
// Badge Network
<Badge
  variant={BadgeVariant.Network}
  name={NETWORK_NAME}
  imageSource={NETWORK_IMAGE_SOURCE}
/>;

// Badge Status
<Badge
  variant={BadgeVariant.Status}
  state={BadgeStatusState.Disconnected}
/>;
```
