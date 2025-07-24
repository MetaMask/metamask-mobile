# ButtonHero

ButtonHero is a hero-style button component built on top of ButtonBase that uses primary default colors with primary pressed states. It features a primary background color (default and pressed states) with white text, making it perfect for prominent call-to-action buttons.

## Props

This component extends [ButtonBaseProps](../../../components/Buttons/Button/foundation/ButtonBase/ButtonBase.types.ts) from [ButtonBase](../../../components/Buttons/Button/foundation/ButtonBase/ButtonBase.tsx) component, except for `labelColor` which is handled internally.

### `label`

Button text.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string \| React.ReactNode                           | Yes                                                     |

### `size`

Optional prop for the size of the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [ButtonSize](../../../components/Buttons/Button/Button.types.ts) | No | Md |

### `onPress`

Function to trigger when pressing the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | Yes                                                     |

### `startIconName`

Optional prop for the icon name of the icon that will be displayed before the label.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconName](../../../components/Icons/Icon/Icon.types.ts) | No |

### `endIconName`

Optional prop for the icon name of the icon that will be displayed after the label.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconName](../../../components/Icons/Icon/Icon.types.ts) | No |

### `loading`

Optional prop to show loading state with ActivityIndicator.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | false                                                  |

### `isDisabled`

Optional param to disable the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | false                                                  |

### `width`

Optional param to control the width of the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [ButtonWidthTypes](../../../components/Buttons/Button/Button.types.ts) \| number | No | ButtonWidthTypes.Auto |

## Usage

```javascript
import ButtonHero from './components-temp/Buttons/ButtonHero';
import { IconName } from './components/Icons/Icon';
import { ButtonSize, ButtonWidthTypes } from './components/Buttons/Button';

// Basic usage
<ButtonHero
  label="Get Started"
  onPress={handleGetStarted}
/>

// With loading state
<ButtonHero
  label="Processing..."
  loading
  onPress={handleSubmit}
/>

// With icons
<ButtonHero
  label="Continue"
  startIconName={IconName.ArrowRight}
  onPress={handleContinue}
/>

// Disabled state
<ButtonHero
  label="Disabled"
  isDisabled
  onPress={handleAction}
/>

// Different sizes
<ButtonHero
  label="Small Hero"
  size={ButtonSize.Sm}
  onPress={handleAction}
/>

// Full width
<ButtonHero
  label="Full Width Hero"
  width={ButtonWidthTypes.Full}
  onPress={handleAction}
/>
```

## Color Behavior

- **Normal State**: Uses `theme.colors.icon.default` (primary blue background)
- **Pressed State**: Uses `theme.colors.icon.defaultPressed` (darker primary blue background) 
- **Text Color**: Always uses `TextColor.Inverse` (white text)
- **Loading Indicator**: Uses `theme.colors.primary.inverse` (white color)

This creates a consistent primary button appearance with proper contrast and accessibility.