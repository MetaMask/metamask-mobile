# Badge

Badge is a union component, which currently only consist of [BadgeNetwork](./variants/BadgeNetwork/BadgeNetwork.tsx)

## Common Props

### `variant`

Variant of badge.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BadgeVariants](../../Badge.types.ts)                                           | Yes                                                     |

## BadgeNetwork Props

### `networkProps`

Props for the network content.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [NetworkProps](../../Networks/Network/Network.types.ts)                                              | Yes                                                     |

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

<Badge
  variant={BadgeVariants.Network}
  networkProps={networkProps}
/>;
```