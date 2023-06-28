# BottomSheetHeader

BottomSheetHeader is a Header component specifically used for BottomSheets.

## Props

This component extends [BottomSheetHeaderProps](../../Header/Header.types.ts) component.

### `onBack`

Optional function to trigger when pressing the back button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                    | No                                                     |

### `onClose`

Optional function to trigger when pressing the back button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                    | No                                                     |

## Header Props

### `children`

Content to wrap to display.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string | ReactNode                                    | Yes                                                     |

### `startAccessory`

Optional prop to include content to be displayed before the title.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | No                                                     |

### `endAccessory`

Optional prop to include content to be displayed after the title.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | No                                                     |


## Usage

```javascript
// BottomSheetHeader with String title
<BottomSheetHeader 
  onBack={()=> {}}
  onClose={()=> {}}>
  {SAMPLE_TITLE_STRING}
</BottomSheetHeader>;

// BottomSheetHeader with custom title
<BottomSheetHeader 
  onBack={()=> {}}
  onClose={()=> {}}>
  {CUSTOM_TITLE_NODE}
</BottomSheetHeader>;
```
