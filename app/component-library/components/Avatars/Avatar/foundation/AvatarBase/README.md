# AvatarBase

The AvatarBase component is a base component of the [Avatar](../../Avatar.tsx). It contains all the shared configurations and styling amongst all Avatar variants and should not be used unless creating a new type of Avatar.

## Props

This component extends [ViewProps](https://reactnative.dev/docs/view-style-props) from React Native's [View](https://reactnative.dev/docs/view) component.

### `size`

Optional enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [AvatarSizes](../../Avatar.types.ts)          | No                                                     | Md                                                     |

## Usage

```javascript
<AvatarBase 
  size={AvatarSizes.Md}>
    <SAMPLE_COMPONENT />
</AvatarBase>;
```
