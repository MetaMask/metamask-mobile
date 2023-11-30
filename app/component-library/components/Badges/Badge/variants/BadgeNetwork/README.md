# BadgeNetwork

![BadgeNetwork](./BadgeNetwork.png)

BadgeNetwork is used on top of an element to display network information. **This component is not meant to be used by itself**. It is used by [BadgeWrapper](../BadgeWrapper/BadgeWrapper.tsx), which can render this component as a badge.

## Props

This component extends [BadgeBaseProps](../../foundation/BadgeBase/BadgeBase.types.ts).

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

## Usage

```javascript
<BadgeNetwork
  variant={BadgeVariant.Network}
  name={NETWORK_NAME}
  imageSource={NETWORK_IMAGE_SOURCE}
/>;
```
