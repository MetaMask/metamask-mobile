# PickerNetwork

PickerNetwork is a component that renders an avatar based on the user selected network.

## Props

This component extends `TouchableOpacityProps` from React Native's [TouchableOpacity](https://reactnative.dev/docs/touchableopacity) component.

### `onPress`

Callback to trigger when pressed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| function                                            | No                                                      |

### `label`

Network label to display.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `imageSource`

The source for the network avatar image.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ImageSourcePropType                                 | No                                                      |

### `hideNetworkName`

Whether to hide the network name text.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| boolean                                             | No                                                      |

## Usage

```javascript
import PickerNetwork from 'app/component-library/components/Pickers/PickerNetwork';

<PickerNetwork
  onPress={() => console.log('Network picker pressed')}
  label="Ethereum"
  imageSource={require('./ethereum-logo.png')}
/>;
```

## Notes

- The component uses an `Avatar` component to display the network icon.
- If `onPress` is provided, a dropdown arrow icon will be displayed.
- The network name can be hidden using the `hideNetworkName` prop.
- The component uses custom styles defined in `PickerNetwork.styles.ts`.