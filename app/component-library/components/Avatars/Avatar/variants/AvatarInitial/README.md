# AvatarInitial

AvatarInitial is a component that renders an initial letter within an avatar.

## Props

This component extends [AvatarBaseProps](../../foundation/AvatarBase/AvatarBase.types.ts) from the [AvatarBase](../../foundation/AvatarBase/AvatarBase.tsx) component.

### `size`

Optional enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [AvatarSizes](../../Avatar.types.ts)          | No                                                     | Md                                                     |

### `backgroundColor`

Optional enum to add color to the background of the Avatar.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [Color](../../../../../constants/typescript.constants.ts) or 'default'          | No                               |'default'                                                     |

## AvatarIcon only props

### `initial`

An initial to be displayed in the Avatar.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                      |

## Usage

```javascript
<AvatarInitial size={AvatarSizes.Md} initial={'Morph'} backgroundColor={'#000000'}/>;
```

