# SelectItem

SelectItem is a wrapper component typically used for item selection scenarios.

## Props

This component extends `TouchableOpacityProps` from React Native's [TouchableOpacityProps](https://reactnative.dev/docs/touchableopacity) component.

### `isSelected`

Determines item is selected.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean    | No                                                     | false                                               |

### `children`

Content to wrap for selection.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | Yes                                                     |

## Usage

```javascript
// Replace import with relative path.
import SelectItem from 'app/component-library/components/Select/Select/SelectItem';

<SelectItem onPress={ONPRESS_HANDLER} isSelected={true}>
  <SampleContent />
</SelectItem>;
```
