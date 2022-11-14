# BadgeNetwork

BadgeNetwork is a badge component that contains the Network as the content. **This component is not meant to be used by itself**. It is used by the [BadgeWrapper](../../../BadgeWrapper/BadgeWrapper.tsx) component, which can render this component as a badge.

## Props

This component extends [BadgeBaseProps](../../foundation/BadgeBase/BadgeBase.types.ts) from the [BadgeBase](../../foundation/BadgeBase/BadgeBase.tsx) component.

### `variant`

Variant of badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeVariants.Network](../../Badge.types.ts)                                           | No                                                     |

### `networkProps`

Props for the network content.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [NetworkProps](../../../../Networks/Network/Network.types.ts)                                              | Yes                                                     |


## Usage

```javascript
const networkImageProps = {
    source: {
        uri: SAMPLE_IMAGE_URI
    }
}
const networkProps = {
  size: NetworkSizes.Md,
  name: SAMPLE_NETWORK_NAME,
  imageProps: networkImageProps,
}

<BadgeNetwork networkProps={networkProps} />;
```
