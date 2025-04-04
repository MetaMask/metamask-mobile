# BottomSheetOverlay

BottomSheetOverlay is a semi-transparent layer that is placed on top of the page content to provide focus on the content placed above the BottomSheet and prevent interaction with the underlying content.

## Props

This component extends [OverlayProp](../../../Overlay/Overlay.types.ts) component.

### `color`

Optional prop to configure the color of the BottomSheetOverlay.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ColorValue                                           | No                                                     |

### `onPress`

Function to trigger when pressing the BottomSheetOverlay.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | No                                                     |

## Usage

```javascript
<BottomSheetOverlay onPress={() => {}}/>;
```
