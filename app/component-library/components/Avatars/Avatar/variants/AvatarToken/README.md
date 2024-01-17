# AvatarToken

AvatarToken is a component that renders a token image.

## Props

This component extends [AvatarBaseProps](../AvatarBase/AvatarBase.types.ts#L18) from [AvatarBase](../Avatar/Avatar.tsx) component.

### `name`

Optional token name.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [tokenName](./AvatarToken.types.ts#L10)             | No                                                      |

### `imageSource`

Optional token image from either a local or remote source.

| <span style="color:gray;font-size:14px">TYPE</span>                   | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------------------------- | :------------------------------------------------------ |
| [ImageSourcePropType](https://reactnative.dev/docs/image#imagesource) | No                                                      |

### `isHaloEnabled`

Boolean value that activates halo effect (blurred image colors around).

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [isHaloEnabled](./AvatarToken.types.ts#L18)         | No                                                      |

## Usage

```javascript
<AvatarToken
  size={AvatarSize.Md}
  name={SAMPLE_TOKEN_NAME}
  imageSource={{ uri: SAMPLE_TOKEN_IMAGE_URL }}
  isHaloEnabled
/>;
```
