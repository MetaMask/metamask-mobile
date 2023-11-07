# Avatar

The Avatar is a round graphic identity. It unifies [AvatarAccount](./variants/AvatarAccount/AvatarAccount.tsx), [AvatarFavicon](./variants/AvatarFavicon/AvatarFavicon.tsx), [AvatarIcon](./variants/AvatarIcon/AvatarIcon.tsx), [AvatarNetwork](./variants/AvatarNetwork/AvatarNetwork.tsx) and [AvatarToken](./variants/AvatarToken/AvatarToken.tsx).

## Common Props

### `variant`

Variant of Avatar.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [AvatarVariants](./Avatar.types.ts)                                              | No                                                     |

### `size`

Optional enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [AvatarSize](./Avatar.types.ts)          | Yes                                                     | Md                                                     |

## AvatarAccount Props

### `type`

Optional enum to select the avatar type between `JazzIcon` and `Blockies`.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [AvatarAccountType](./variants/AvatarAccount.types.ts)    | Yes                                                     | JazzIcon                                               |

### `accountAddress`

An Ethereum wallet address.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

## AvatarFavicon Props

### `imageSource`

A favicon image from either a local or remote source.

| <span style="color:gray;font-size:14px">TYPE</span>                   | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------------------------- | :------------------------------------------------------ |
| [ImageSourcePropType](https://reactnative.dev/docs/image#imagesource) | Yes                                                     |

## AvatarIcon Props

### `name`

Name of icon to use.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconName](../Icons/Icon.types.ts)                  | Yes                                                     |

### `iconColor`

Optional color of the icon.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | No                                                      |

### `backgroundColor`

Optional background color of the icon.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | No                                                      |

## AvatarNetwork Props

### `name`

Optional network name.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [name](./variants/AvatarNetwork/AvatarNetwork.types.ts)                | No                                                      |

### `imageSource`

Optional network image from either a local or remote source.

| <span style="color:gray;font-size:14px">TYPE</span>                   | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------------------------- | :------------------------------------------------------ |
| [ImageSourcePropType](https://reactnative.dev/docs/image#imagesource) | No                                                      |

## AvatarToken Props

### `name`

Optional token name.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [tokenName](./variants/AvatarToken/AvatarToken.types.ts)             | No                                                      |

### `imageSource`

Optional token image from either a local or remote source.

| <span style="color:gray;font-size:14px">TYPE</span>                   | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------------------------- | :------------------------------------------------------ |
| [ImageSourcePropType](https://reactnative.dev/docs/image#imagesource) | No                                                      |

### `isHaloEnabled`

Boolean value that activates halo effect (blurred image colors around).

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [isHaloEnabled](./variants/AvatarToken/AvatarToken.types.ts)         | No                                                      |

## Usage

```javascript
// AvatarAccount
<Avatar
  variant={AvatarVariants.Account}
  type={AvatarAccountType.Jazzicon}
  accountAddress={ACCOUNT_ADDRESS}
  size={AvatarSize.Md}
/>;

// AvatarFavicon
<Avatar
  variant={AvatarVariants.Favicon}
  size={AvatarSize.Md} 
  imageSource={{ uri: IMAGE_URL }}
/>;

// AvatarIcon
<Avatar
  variant={AvatarVariants.Icon}
  size={AvatarSize.Md}
  name={IconName.Bank}
  iconColor={ICON_COLOR}
  backgroundColor={ICON_BACKGROUND_COLOR}
/>;

// AvatarNetwork
<Avatar
  variant={AvatarVariants.Network}
  size={AvatarSize.Md}
  name={NETWORK_NAME}
  imageSource={{ uri: NETWORK_IMAGE_URL }}
/>;

// AvatarToken
<Avatar
  variant={AvatarVariants.Token}
  size={AvatarSize.Md}
  name={TOKEN_NAME}
  imageSource={{ uri: TOKEN_IMAGE_URL }}
  isHaloEnabled
/>;
```
