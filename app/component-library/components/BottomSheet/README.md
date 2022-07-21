# BottomSheet

BottomSheet is a sheet component typically used when we need content that slides up from the bottom. This is a wrapper component that your screens utilize and is meant to be used with React Navigation as an action sheet.

## Props

### `onDismiss`

Callback that gets triggered when sheet is dismissed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| function                                            | No                                                      |

### `children`

Content to wrap in sheet.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | Yes                                                     |

## Usage

```javascript
// Update to import from relative paths
import BottomSheet, {
  BottomSheetRef,
} from 'app/component-library/components/BottomSheet/index.ts';

const NavigationScreen = () => {
  const bottomSheetRef = (useRef < BottomSheetRef) | (null > null);

  // Callback to trigger after sheet has been dismissed.
  const postDismissCallback = () => {};

  // Calling hide automatically navigates back once hide animation is complete. Hide takes an optional callback, which gets triggered post sheet dismissal.
  const onConfirm = () => bottomSheetRef.current?.hide?.(postDismissCallback);

  // Optional callback for when sheet has finished hiding.
  const onDismiss = () => {};

  return (
    <BottomSheet ref={bottomSheetRef} onDismiss={onDismiss}>
      <Content onPress={onConfirm} />
    </BottomSheet>
  );
};
```
