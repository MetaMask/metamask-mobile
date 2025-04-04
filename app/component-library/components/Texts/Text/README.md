# Text

Text is a text component that standardizes on typography provided through theme via [@metamask/design-tokens](https://www.npmjs.com/package/@metamask/design-tokens) library.

## Props

This component extends [TextProps](https://reactnative.dev/docs/text-style-props) from React Native's [Text](https://reactnative.dev/docs/text) component.

### `variant`

Optional enum to select between Typography variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [TextVariant](./Text.types.ts#L6)                   | No                                                      | BodyMD                                                |

## Usage

```javascript
// Replace import with relative path.
import Text, { TextVariant } from 'app/component-library/components/Texts/Text';

<Text variant={TextVariant.HeadingSM}>{TEXT_LABEL}</Text>;
```
