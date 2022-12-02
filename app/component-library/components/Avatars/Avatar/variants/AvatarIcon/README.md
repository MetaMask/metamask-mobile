# AvatarIcon

AvatarIcon is a component that renders an icon contained within an avatar.

## Props

This component extends [AvatarBaseProps](../AvatarBase/AvatarBase.types.ts#L18) from [AvatarBase](../Avatar/Avatar.tsx) component.

### `name`

Name of icon to use.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconNames](../Icon/Icon.types.ts#L53)               | Yes                                                     |

## Usage

```javascript
// Replace import with relative path.
import AvatarIcon, {
  AvatarIcon,
} from 'app/component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from 'app/component-library/components/Avatars/Avatar/Avatar';
import { IconNames } from 'app/component-library/components/Icon';

<AvatarIcon size={AvatarSize.Md} name={IconNames.Bank} />;
```
