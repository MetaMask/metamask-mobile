# MultiselectItem

MultiselectItem is a wrapper component typically used for multi-select scenarios.

## Props

This component extends `TouchableOpacityProps` from React Native's [TouchableOpacity](https://reactnative.dev/docs/touchableopacity) component.

### `isSelected`

Determines item is selected.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean    | No                                                     | false                                               |
### `children`

Content to wrap for multiselect.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | Yes                                                     |

## Usage

```javascript
// Replace import with relative path.
import MultiselectItem from 'app/component-library/components/Select/Multiselect/MultiselectItem';

<MultiselectItem onPress={ONPRESS_HANDLER} isSelected={true}>
  <SampleContent />
</MultiselectItem>;
```
