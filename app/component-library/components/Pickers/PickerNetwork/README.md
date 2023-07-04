# PickerNetwork

PickerNetwork is a component that renders an avatar based on the user selected network.

## Props

This component extends `TouchableOpacityProps` from React Native's [TouchableOpacity](https://reactnative.dev/docs/touchableopacity) component.

### `imageSource`

Optional network image from either a local or remote source.

| <span style="color:gray;font-size:14px">TYPE</span>                   | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------------------------- | :------------------------------------------------------ |
| [ImageSourcePropType](https://reactnative.dev/docs/image#imagesource) | Yes                                                     |

### `label`

Network label to display.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `onPress`

Callback to trigger when picker is pressed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| function                                            | Yes                                                     |

```javascript
// Replace import with relative path.
import PickerNetwork from 'app/component-library/components/Pickers/PickerNetwork';

<PickerNetwork
  onPress={ONPRESS_CALLBACK}
  label={NETWORK_LABEL}
  image={{ uri: NETWORK_IMAGE_URL }}
/>;
```
