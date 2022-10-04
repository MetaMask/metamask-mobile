# ButtonBase

ButtonBase is a base component that we use for constructing context specific buttons.

## Props

This component extends `TouchableOpacityProps` from React Native's [TouchableOpacity](https://reactnative.dev/docs/touchableopacity) component.

### `label`

ButtonBase text.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `labelColor`

Color of label. Applies to icon too.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | No                                                      |

### `size`

Enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [ButtonSize](../../Button.types.ts)          | Yes                                                     | Md                                                     |

### `onPress`

Function to trigger when pressing the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | Yes                                                     |

### `iconName`

Icon name of the icon that will be displayed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconName](../Icon/Icon.types.ts#53)                | False                                                   |

## Usage

```javascript
// Replace import with relative path.
import ButtonBase, {
  ButtonSize,
} from 'app/component-library/components/Avatars/Avatar/foundation/AvatarBase';
import { IconName } from 'app/component-library/components/Icon';

<ButtonBase
  label={LABEL}
  labelColor={LABEL_COLOR}
  iconName={IconName.BankFilled}
  size={ButtonSize.Md}
  onPress={ONPRESS_HANDLER}
/>;
```
