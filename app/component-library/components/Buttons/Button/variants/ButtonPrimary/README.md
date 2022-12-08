# ButtonPrimary

ButtonPrimary is used for primary call to actions.

## Props

This component extends [ButtonBaseProps](../ButtonBase/ButtonBase.types.ts#L14) from [ButtonBase](../ButtonBase/ButtonBase.tsx) component.

### `buttonPrimaryVariants`

Optional enum use to select between variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [ButtonPrimaryVariants](./ButtonPrimary.types.ts#L7) | No                                                      | Normal                                                 |

## Usage

```javascript
// Replace import with relative path.
import ButtonPrimary, {
  ButtonPrimaryVariants,
} from 'app/component-library/components/ButtonPrimary';
import { ButtonSize } from 'app/component-library/components/Buttons/Button/Button';
import { IconName } from 'app/component-library/components/Icon';

<ButtonPrimary
  label={LABEL}
  iconName={IconName.BankFilled}
  size={ButtonSize.Md}
  onPress={ONPRESS_HANDLER}
  buttonPrimaryVariants={ButtonPrimaryVariants.Normal}
/>;
```
