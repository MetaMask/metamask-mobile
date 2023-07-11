# BottomSheetContent

BottomSheetContent is a component used to represent the content area within a BottomSheet and should be used within BottomSheet.

## Props

### `children`

Optional content prop to be displayed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | No                                                     |

### `isFullscreen`

Optional prop to toggle full screen state of BottomSheetContent.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                              | No                                                     | false                                                  |

### `isInteractable`

Optional prop to toggle full screen state of BottomSheetContent.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                              | No                                                     | false                                                  |

### `onDismissed`

Optional callback that gets triggered when sheet is dismissed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| Function                                              | No                                                     | false                                                  |


## Usage

```javascript
<BottomSheetContent 
  isFullscreen 
  isInteractable 
  onDismissed={SAMPLE_DISMISS_FUNCTION}>
  {SAMPLE_CONTENT}
</BottomSheetContent>
```
