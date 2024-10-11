# AvatarBase

The AvatarBase is a **wrapper** component responsible for enforcing dimensions and border radius for AvatarBase components.

## Props

This component extends [ViewProps](https://reactnative.dev/docs/view-style-props) from React Native's [View](https://reactnative.dev/docs/view) component.

### `size`

Optional enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [AvatarSize](../../Avatar.types.ts)                 | Yes                                                     | Md                                                     |

### `includesBorder`

Optional boolean to include a border or not.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| `boolean`                                           | No                                                      | `false`                                                |

## Usage

```javascript
<AvatarBase size={AvatarSize.Md}>
  <SampleImageComponent />
</AvatarBase>
```
