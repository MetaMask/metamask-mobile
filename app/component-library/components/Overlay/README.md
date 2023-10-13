# Overlay

Overlay is a semi-transparent layer that is placed on top of the page content to provide focus on the content placed above the modal and prevent interaction with the underlying content.

## Props

This component extends React Native's [TouchableOpacityProps](https://reactnative.dev/docs/touchableopacity) component.

### `color`

Optional prop to configure the color of the Overlay.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ColorValue                                           | No                                                     |

### `onPress`

Function to trigger when pressing the overlay.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | No                                                     |

## Usage

```javascript
<Overlay onPress={() => {}}/>;
```
