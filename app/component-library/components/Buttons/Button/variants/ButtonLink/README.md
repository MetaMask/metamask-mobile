# ButtonLink

ButtonLink is a component that we use for accessing external links or navigating to other places in the app.

## Props

This component extends [TextProps](../../BaseText/Text.types.ts#L32) from [Text](../../Text) component.

### `onPress`

Function to trigger when pressing the link.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | Yes                                                     |

## Usage

```javascript
// Replace import with relative path.
import ButtonLink, from 'app/component-library/components/ButtonLink';
import { TextVariant } from 'app/component-library/components/Texts/Text';

<ButtonLink
  variant={TextVariant.HeadingSM}
  onPress={ONPRESS_HANDLER}
>{LINK_LABEL}</ButtonLink>;
```
