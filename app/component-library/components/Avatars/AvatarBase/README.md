# AvatarBase

The AvatarBase is a **wrapper** component responsible for enforcing dimensions and border radius for AvatarBase components.

## Props

This component extends [ViewProps](https://reactnative.dev/docs/view-style-props) from React Native's [View](https://reactnative.dev/docs/view) component.

### `size`

Optional enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [AvatarBaseSize](./AvatarBase.types.ts#L6)          | Yes                                                     | Md                                                     |

## Usage

```javascript
// Replace import with relative path.
import AvatarBase, {
  AvatarBaseSize,
} from 'app/component-library/components/Avatars/AvatarBase';

<AvatarBase 
  size={AvatarBaseSize.Md}>
    <SampleImageComponent />
</AvatarBase>;
```
