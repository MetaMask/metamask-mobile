# TextWithPrefixIcon

TextWithPrefixIcon is a [Text](../Text/Text.tsx) component with a prefix [Icon](../../Icon/Icon.tsx) component.

## Props

This component extends [TextProps](../Text/Text.types.ts#L33).

### `iconProps`

Props for the Prefix Icon.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconProps](../../Icon/Icon.types.ts#L21)                                              | Yes                                                     |

### `variant`

Optional enum to select between Typography variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [TextVariant](../Text/Text.types.ts#L6)                   | No                                                      | BodyMD                                                |

## Usage

```javascript
// Replace import with relative path.
import TextWithPrefixIcon from 'app/component-library/components/Texts/TextWithPrefixIcon';
import { TextVariant } from 'app/component-library/components/Texts/Text';

<TextWithPrefixIcon variant={TextVariant.HeadingSMRegular} iconProps={SAMPLE_ICON_PROPS}>
    {SAMPLE_TEXT}
</TextWithPrefixIcon>;
```
