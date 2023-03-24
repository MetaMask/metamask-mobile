# HelpText

HelpText is a [Text](../../Texts/Text/Text.tsx) component, used as feedback text under a form field including error, success, warning or info messages.

## Props

This component extends [TextProps](../../Texts/Text/Text.types.ts).

### `severity`

Optional enum to select the severity color between `Default`,  `Success`, and `Error`.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [HelpTextSeverity](./HelpText.types.ts)    | No                                                     | HelpTextSeverity.Default                               |

## Usage

```javascript
<HelpText severity={HelpTextSeverity.Error}>{SAMPLE_TEXT}</HelpText>;
```
