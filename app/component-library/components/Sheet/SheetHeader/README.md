# SheetHeader

SheetHeader is a header component and is currently used within the [BottomSheet](../BottomSheet/BottomSheet.tsx) component.

## Props

### `title`

Sheet title.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `onBack`

Optional callback when back button is pressed. The back button appears when this property is set.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| function                                            | No                                                      |

### `actionButtonOptions`

Optional action option, which includes a callback when the action button is pressed. The action button appears when this property is set.

| <span style="color:gray;font-size:14px">TYPE</span>         | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :---------------------------------------------------------- | :------------------------------------------------------ |
| [SheetHeaderActionButtonOptions](./SheetHeader.types.ts#L1) | No                                                      |

## Usage

```javascript
// Replace with relative import.
import SheetHeader from 'app/component-library/components/SheetHeader';

<SheetHeader
  onBack={ONBACK_HANDLER}
  actionButtonOptions={{ label: ACTION_LABEL, onPress: ONPRESS_HANDLER }}
  title={TITLE_LABEL}
/>;
```
