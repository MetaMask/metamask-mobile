# ButtonSecondary

ButtonSecondary is used for secondary call to actions.

## Props

This component extends [ButtonBaseProps](../ButtonBase/ButtonBase.types.ts#L14) from [ButtonBase](../ButtonBase/ButtonBase.tsx) component.

### `variant`

Optional enum use to select between variants.

| <span style="color:gray;font-size:14px">TYPE</span>     | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :------------------------------------------------------ | :------------------------------------------------------ | :----------------------------------------------------- |
| [ButtonSecondaryVariant](./ButtonSecondary.types.ts#L7) | No                                                      | Normal                                                 |

## Usage

```javascript
// Replace import with relative path.
import ButtonSecondary, {
  ButtonSecondaryVariant,
} from 'app/design-system/components/ButtonSecondary';
import { ButtonBaseSize } from 'app/design-system/components/Avatars/Avatar/foundation/AvatarBase';
import { IconName } from 'app/design-system/components/Icon';

<ButtonSecondary
  label={LABEL}
  iconName={IconName.BankFilled}
  size={ButtonBaseSize.Md}
  onPress={ONPRESS_HANDLER}
  variant={ButtonSecondaryVariant.Normal}
/>;
```
