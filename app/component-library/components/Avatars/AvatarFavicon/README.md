# AvatarFavicon

AvatarFavicon is an image component that renders an icon that is provided in the form of a URL.

## Props

This component extends [AvatarBaseProps](../AvatarBase/AvatarBase.types.ts#L18) from [AvatarBase](../Avatar/Avatar.tsx) component.

### `imageUrl`

An icon URL.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| String                                              | Yes                                                     |

## Usage

```javascript
// Replace import with relative path.
import AvatarFavicon from 'app/component-library/components/Avatars/AvatarAccount';
import { AvatarBaseSize } from 'app/component-library/components/Avatars/AvatarBase';

<AvatarFavicon size={AvatarBaseSize.Md} imageUrl={IMAGE_URL} />;
```
