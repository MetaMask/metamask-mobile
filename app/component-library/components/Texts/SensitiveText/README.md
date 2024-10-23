# SensitiveText

SensitiveText is a component that extends the Text component to handle sensitive information. It provides the ability to hide or show the text content, replacing it with dots when hidden.

## Props

This component extends all props from the [Text](../Text/README.md) component and adds the following:

### `isHidden`

Boolean to determine whether the text should be hidden or visible.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | Yes                                                     | false                                                  |

### `length`

Determines the length of the hidden text (number of dots). Can be a predefined SensitiveTextLength or a custom string number.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [SensitiveTextLengthType](./SensitiveText.types.ts#L14) \| [CustomLength](./SensitiveText.types.ts#L19) | No   | SensitiveTextLength.Short                              |

### `children`

The text content to be displayed or hidden.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| string                                              | Yes                                                     | -                                                      |

## Usage

```javascript
import SensitiveText from 'app/component-library/components/Texts/SensitiveText';
import { TextVariant } from 'app/component-library/components/Texts/Text';
import { SensitiveTextLength } from 'app/component-library/components/Texts/SensitiveText/SensitiveText.types';

<SensitiveText
  isHidden={true}
  length={SensitiveTextLength.Medium}
  variant={TextVariant.BodyMD}
>
  Sensitive Information
</SensitiveText>

<SensitiveText
  isHidden={true}
  length="15"
  variant={TextVariant.BodyMD}
>
  Custom Length Hidden Text
</SensitiveText>
```

This will render a Text component with dots instead of the actual text when `isHidden` is true, and the original text when `isHidden` is false. The number of asterisks is determined by the `length` prop.
