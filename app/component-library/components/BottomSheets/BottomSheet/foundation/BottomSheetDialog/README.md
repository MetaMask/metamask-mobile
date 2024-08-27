# BottomSheetDialog

BottomSheetDialog is a component used to represent the content area within a BottomSheet and should be used within BottomSheet.

## Props

### `children`

Optional content prop to be displayed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | No                                                     |

### `isFullscreen`

Optional prop to toggle full screen state of BottomSheetDialog.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                              | No                                                     | false                                                  |

### `isInteractable`

Optional prop to toggle full screen state of BottomSheetDialog.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                              | No                                                     | false                                                  |

### `onClose`

Optional callback that gets triggered when sheet is closed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| Function                                              | No                                                     | false                                                  |

### `onOpen`

Optional callback that gets triggered when sheet is opened.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| Function                                              | No                                                     | false                                                  |

## Usage

```javascript
<BottomSheetDialog 
  isFullscreen 
  isInteractable 
  onClose={SAMPLE_CLOSE_FUNCTION}
  onOpen={SAMPLE_OPEN_FUNCTION}>
  {SAMPLE_CONTENT}
</BottomSheetDialog>
```
