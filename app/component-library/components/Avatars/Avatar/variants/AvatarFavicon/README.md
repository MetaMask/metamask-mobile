# AvatarFavicon

AvatarFavicon is an image component that renders an icon that is provided in the form of a URL.

## Props

This component extends [AvatarBaseProps](../AvatarBase/AvatarBase.types.ts#L18) from [AvatarBase](../Avatar/Avatar.tsx) component.

### `imageSource`

A favicon image from either a local or remote source.

| <span style="color:gray;font-size:14px">TYPE</span>                   | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------------------------- | :------------------------------------------------------ |
| [ImageSourcePropType](https://reactnative.dev/docs/image#imagesource) | Yes                                                     |

## Usage

```javascript
// Replace import with relative path.
import AvatarFavicon from 'app/component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from 'app/component-library/components/Avatars/Avatar/Avatar';

<AvatarFavicon size={AvatarSize.Md} imageSource={{ uri: IMAGE_URL }} />;
```
