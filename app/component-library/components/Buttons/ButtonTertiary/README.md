# ButtonTertiary

ButtonTertiary is used for secondary call to actions.

## Props

This component extends [ButtonBaseProps](../ButtonBase/ButtonBase.types.ts#L14) from [ButtonBase](../ButtonBase/ButtonBase.tsx) component.

### `variant`

Optional enum use to select between variants.

| <span style="color:gray;font-size:14px">TYPE</span>   | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :---------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [ButtonTertiaryVariant](./ButtonTertiary.types.ts#L7) | No                                                      | Normal                                                 |

## Usage

```javascript
// Replace import with relative path.
import ButtonTertiary, {
  ButtonTertiaryVariant,
} from 'app/component-library/components/ButtonTertiary';
import { ButtonBaseSize } from 'app/component-library/components/Avatars/AvatarBase';
import { IconName } from 'app/component-library/components/Icon';

<ButtonTertiary
  label={LABEL}
  iconName={IconName.BankFilled}
  size={ButtonBaseSize.Md}
  onPress={ONPRESS_HANDLER}
  variant={ButtonTertiaryVariant.Normal}
/>;
```
