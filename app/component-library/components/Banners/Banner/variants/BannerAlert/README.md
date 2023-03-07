# BannerAlert

BannerAlert is a component that renders an avatar based on the users account address.

## BannerAlert Props

This component extends [BannerBaseProps](../../foundation/BannerBase/BannerBase.types.ts) from [BannerBase](../Avatar/Avatar.tsx) component.

### `severity`

Optional enum to determine the severity color of the BannerAlert.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [BannerAlertSeverity](./BannerAlert.types.ts)    | No                                                     | BannerAlertSeverity.Info                                |

### `variant`

Variant of Banner.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BannerVariant](../../Banner.types.ts)               | Yes                                                     |

## Common Props

### `title`

Title of the Banner.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                                | No                                                     |

### `titleProps`

Optional prop to control the title's props.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [TextProps](../../../../Texts/Text/Text.types.ts)                                         | No                                                     |

## Usage

```javascript
<BannerAlert
  type={BannerAlertType.Jazzicon}
  accountAddress={ACCOUNT_ADDRESS}
  size={AvatarSize.Md}
/>;
```
