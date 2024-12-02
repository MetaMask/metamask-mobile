# PickerBase

PickerBase is a **wrapper** component used for providing a dropdown icon next to wrapped content. It's designed to be a flexible base for various picker-style components.

## Props

This component extends `TouchableOpacityProps` from React Native's [TouchableOpacity](https://reactnative.dev/docs/touchableopacity).

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

### `iconSize`

Size of the dropdown icon.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| IconSize                                            | No                                                      | IconSize.Md                                            |

### `dropdownIconStyle`

Custom styles for the dropdown icon.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ViewStyle                                           | No                                                      |

### `style`

Custom styles for the main container.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ViewStyle                                           | No                                                      |

## Usage

```javascript
import React from 'react';
import { Text } from 'react-native';
import PickerBase from 'app/component-library/components/Pickers/PickerBase';
import { IconSize } from 'app/component-library/components/Icons/Icon';

const ExampleComponent = () => (
  <PickerBase 
    onPress={() => console.log('Picker pressed')}
    iconSize={IconSize.Lg}
    dropdownIconStyle={{ marginLeft: 20 }}
    style={{ backgroundColor: 'lightgray' }}
  >
    <Text>Select an option</Text>
  </PickerBase>
);

export default ExampleComponent;
```

## Notes

- The component uses a `TouchableOpacity` as its base, providing press feedback.
- It automatically includes a dropdown icon (ArrowDown) to the right of the content.
- The component is designed to be flexible and can be customized using the `style` and `dropdownIconStyle` props.
- The dropdown icon color is determined by the theme's `colors.icon.default`.