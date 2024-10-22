# SensitiveText

SensitiveText is a component that extends the Text component to handle sensitive information. It provides the ability to hide or show the text content, replacing it with asterisks when hidden.

## Props

This component extends all props from the [Text](../Text/README.md) component and adds the following:

### `isHidden`

Boolean to determine whether the text should be hidden or visible.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | Yes                                                     | -                                                      |

### `length`

Enum to determine the length of the hidden text (number of asterisks).

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [SensitiveLengths](./SensitiveText.types.ts#L3)     | No                                                      | SensitiveLengths.Short                                 |

### `children`

The text content to be displayed or hidden.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| string                                              | Yes                                                     | -                                                      |

## Usage

```javascript
// Replace import with relative path.
import SensitiveText from 'app/component-library/components/Texts/SensitiveText';
import { TextVariant } from 'app/component-library/components/Texts/Text';
import { SensitiveLengths } from 'app/component-library/components/Texts/SensitiveText/SensitiveText.types';

<SensitiveText
  isHidden={true}
  length={SensitiveLengths.Medium}
  variant={TextVariant.BodyMD}
>
  Sensitive Information
</SensitiveText>
```

This will render a Text component with asterisks instead of the actual text when `isHidden` is true, and the original text when `isHidden` is false. The number of asterisks is determined by the `length` prop.
