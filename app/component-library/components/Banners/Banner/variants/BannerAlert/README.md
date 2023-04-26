# BannerAlert

BannerAlert is an inline notification that notifies users of important information & sometimes time-sensitive changes.

## BannerAlert Props

This component extends [BannerBaseProps](../../foundation/BannerBase/BannerBase.types.ts) from [BannerBase](../../foundation/BannerBase/BannerBase.tsx) component.

### `severity`

Optional prop to control the severity of the BannerAlert.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [BannerAlertSeverity](./BannerAlert.types.ts)    | No                                                     | BannerAlertSeverity.Info                                |

### `variant`

Variant of Banner.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BannerVariant](../../Banner.types.ts)               | No                                                     |

## Common Props

### `title`

Optional prop for title of the Banner.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string or ReactNode                                   | No                                                     |

### `description`

Optional description below the title.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string or ReactNode                                   | No                                                     |


### `actionButtonProps`

Optional prop to control the action button's props.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [ButtonProps](../../../../Buttons/Button/Button.types.ts)                                  | No                                                     |

### `onClose`

Optional function to trigger when pressing the action button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | No                                                     |

### `closeButtonProps`

Optional prop to control the close button's props.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [ButtonIconProps](../../../../Buttons/ButtonIcon/ButtonIcon.types.ts)                                  | No                                                     |

## Usage

```javascript
<BannerAlert
  severity={BannerAlertSeverity.Error}
  title={SAMPLE_BANNERALERT_TITLE}
  description={SAMPLE_BANNERALERT_DESCRIPTION}
  actionButtonProps={{
    label: SAMPLE_BANNERALERT_ACTIONBUTTONLABEL,
    onPress: () => {}
  }}
  onClose={() => {}}
/>;
```
