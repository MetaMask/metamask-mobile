# TagColored

## TagColored Props

This component extends React Native's [ViewProps](https://reactnative.dev/docs/view) component.

### `color`

Optional prop to configure the color of the TagColored

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [TagColor](./TagColored.types.ts)    | No                                                     | TagColor.Default                                |

### `children`

Content to wrap to display.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string or ReactNode                                   | Yes                                                     |

## Usage

```javascript
// Passing text to children
<TagColored color={TagColor.Default}>SAMPLE TAGCOLORED TEXT</TagColored>;

// Passing node to children
<TagColored color={TagColor.Default}>
  <Text>SAMPLE TAGCOLORED TEXT</Text>
</TagColored>;

// Configuring different colors
<TagColored color={TagColor.Default}>SAMPLE TAGCOLORED TEXT</TagColored>;
<TagColored color={TagColor.Success}>SAMPLE TAGCOLORED TEXT</TagColored>;
<TagColored color={TagColor.Info}>SAMPLE TAGCOLORED TEXT</TagColored>;
<TagColored color={TagColor.Danger}>SAMPLE TAGCOLORED TEXT</TagColored>;
<TagColored color={TagColor.Warning}>SAMPLE TAGCOLORED TEXT</TagColored>;
```
