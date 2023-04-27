# PickerBase

PickerBase is a **wrapper** component used for providing a dropdown icon next to wrapped content.

## Props

This component extends `TouchableOpacityProps` from React Native's [TouchableOpacityProps](https://reactnative.dev/docs/touchableOpacity) opacity.

### `onPress`

Callback to trigger when pressed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| function                                            | Yes                                                     |

### `children`

Content to wrap in PickerBase.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | Yes                                                     |

```javascript
// Replace import with relative path.
import PickerBase from 'app/component-library/components/Pickers/PickerBase';

<PickerBase onPress={ONPRESS_CALLBACK}>
  <SampleContent />
</PickerBase>;
```
