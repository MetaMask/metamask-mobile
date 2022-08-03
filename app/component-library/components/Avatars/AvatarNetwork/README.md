# AvatarNetwork

AvatarNetwork is a component that renders an network image based on the user selected network.

## Props

This component extends [AvatarBaseProps](../AvatarBase/AvatarBase.types.ts#L18) from [AvatarBase](../Avatar/Avatar.tsx) component.

### `networkName`

Chain name

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [networkName](./AvatarNetwork.types.ts#L11)         | No                                                      |

### `networkImageUrl`

Chain image URL

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [networkImageUrl](./AvatarNetwork.types.ts#L15)     | No                                                      |

## Usage

```javascript
// Replace import with relative path.
import AvatarNetwork from 'app/component-library/components/Avatars/AvatarNetwork';
import { AvatarBaseSize } from 'app/component-library/components/Avatars/AvatarBase';

<AvatarNetwork
  size={AvatarBaseSize.Md}
  networkName={NETWORK_NAME}
  networkImageUrl={NETWORK_IMAGE_URL}
/>;
```
