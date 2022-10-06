# AvatarNetwork

AvatarNetwork is a component that renders an network image based on the user selected network.

## Props

This component extends [AvatarBaseProps](../AvatarBase/AvatarBase.types.ts#L18) from [AvatarBase](../Avatar/Avatar.tsx) component.

### `name`

Optional network name.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [name](./AvatarNetwork.types.ts#L11)                | No                                                      |

### `imageSource`

Optional network image from either a local or remote source.

| <span style="color:gray;font-size:14px">TYPE</span>                   | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------------------------- | :------------------------------------------------------ |
| [ImageSourcePropType](https://reactnative.dev/docs/image#imagesource) | No                                                      |

## Usage

```javascript
// Replace import with relative path.
import AvatarNetwork from 'app/component-library/components/Avatars/AvatarNetwork';
import { AvatarSize } from 'app/component-library/components/Avatars/Avatar/Avatar';

<AvatarNetwork
  size={AvatarSize.Md}
  name={NETWORK_NAME}
  imageSource={{ uri: NETWORK_IMAGE_URL }}
/>;
```
