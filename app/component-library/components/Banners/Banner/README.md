# Banner

This component is a union Banner component, which consists of [BannerAlert](../BannerAlert/BannerAlert.tsx) and [BannerTip](../BannerTip/BannerTip.tsx).

## Banner Props

### `variant`

Variant of Banner.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BannerVariant](../../Banner.types.ts)               | Yes                                                     |

## BannerAlert Props

### `severity`

Optional enum to determine the severity color of the BannerAlert.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [BannerAlertSeverity](./BannerAlert.types.ts)    | No                                                     | BannerAlertSeverity.Info                                |

## BannerTip Props

### `logoType`

Optional enum to determine the logo type of the Banner.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [BannerLogoType](./Banner.types.ts)    | No                                                     | BannerLogoType.Greeting                                |

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

### `description`

Optional description below the title.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                                | No                                                     |

### `descriptionProps`

Optional prop to control the description's props.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [TextProps](../../../../Texts/Text/Text.types.ts)                                         | No                                                     |

### `descriptionEl`

For custom description with links, pass in node element.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| React.ReactNode                                       | No                                                     |

### `actionButtonLabel`

Label for optional action button below the description and title.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | No                                                     |

### `actionButtonOnPress`

Function to trigger when pressing the action button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | No                                                     |

### `actionButtonProps`

Optional prop to control the action button's props.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [ButtonProps](../../../../Buttons/Button/Button.types.ts)                                  | No                                                     |

### `onClose`

Function to trigger when pressing the action button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | No                                                     |

### `closeButtonProps`

Optional prop to control the close button's props.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [ButtonIconProps](../../../../Buttons/ButtonIcon/ButtonIcon.types.ts)                                  | No                                                     |

### `children`

Optional prop to add children components to the Banner

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| React.ReactNode                                     | No                                                     |

## Usage

```javascript

// Banner Alert
<Banner
  variant={BannerVariant.Alert}
  severity={BannerAlertSeverity.Error}
  title={SAMPLE_BANNERALERT_TITLE}
  description={SAMPLE_BANNERALERT_DESCRIPTION}
  actionButtonLabel={SAMPLE_BANNERALERT_ACTIONBUTTONLABEL}
  actionButtonOnPress={() => {}}
  onClose={() => {}}
/>;

// Banner Tip
<Banner
  variant={BannerVariant.Tip}
  logoType={BannerLogoType.Greeting}
  title={SAMPLE_BANNERALERT_TITLE}
  description={SAMPLE_BANNERALERT_DESCRIPTION}
  actionButtonLabel={SAMPLE_BANNERALERT_ACTIONBUTTONLABEL}
  actionButtonOnPress={() => {}}
  onClose={() => {}}
/>;
```
