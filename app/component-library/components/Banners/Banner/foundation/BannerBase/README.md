# BannerBase

BannerBase serves as a base for all banner variants. It contains  standard props such as information and related actions. 

## BannerBase Props

This component extends React Native's [ViewProps](https://reactnative.dev/docs/view) component.

### `variant`

Variant of Banner.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [BannerVariant](../../Banner.types.ts)               | No                                                     |

### `startAccessory`

Optional content to be displayed before the info section.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| React.ReactNode                                           | No                                                     |

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

### `children`

Optional prop to add children components to the Banner

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| React.ReactNode                                     | No                                                     |

## Usage

```javascript
<BannerBase
  startAccessory={SAMPLE_BANNERBASE_ACCESSORY}
  title={SAMPLE_BANNERBASE_TITLE}
  description={SAMPLE_BANNERBASE_DESCRIPTION}
  actionButtonProps={{
    label: SAMPLE_BANNERBASE_ACTIONBUTTONLABEL,
    onPress: () => {}
  }}
  onClose={() => {}}
>
  {SAMPLE_ADDITIONAL_ACCESSORY}
</BannerBase>;
```
