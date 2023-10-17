# TextEstimated

TextEstimated is a [Text](../Text/Text.tsx) component with a prefix Tilde [Icon](../../Icons/Icon.tsx).

## Props

This component extends [TextProps](../Text/Text.types.ts#L33).

### `variant`

Optional enum to select between Typography variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [TextVariant](./Text.types.ts#L6)                   | No                                                      | BodyMD                                                |

## Usage

```javascript
// Replace import with relative path.
import TextEstimated from 'app/components/UI/TextEstimated';
import { TextVariant } from 'app/component-library/components/Texts/Text';

<TextEstimated variant={TextVariant.HeadingSMRegular}>
    {SAMPLE_TEXT}
</TextEstimated>;
```
