# AvatarToken

AvatarToken is a component that renders a token image.

## Props

This component extends [AvatarBaseProps](../AvatarBase/AvatarBase.types.ts#L18) from [AvatarBase](../Avatar/Avatar.tsx) component.

### `tokenName`

Token name

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [tokenName](./AvatarToken.types.ts#L10)             | No                                                      |

### `tokenImageUrl`

Token image URL

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [tokenImageUrl](./AvatarToken.types.ts#L10)         | No                                                      |

### `showHalo`

Boolean value that activates halo effect(blurred image colors around)
| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [showHalo](./AvatarToken.types.ts#L18) | No |

## Usage

```javascript
// Replace import with relative path.
import AvatarToken from 'app/component-library/components/Avatars/AvatarToken';
import { AvatarBaseSize } from 'app/component-library/components/Avatars/AvatarBase';

<AvatarToken
  size={AvatarBaseSize.Md}
  tokenName={TOKEN_NAME}
  tokenImageUrl={TOKEN_IMAGE_URL}
  showHalo
/>;
```
