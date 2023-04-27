# SheetBottom

SheetBottom is a sheet component typically used when we need content that slides up from the bottom. This is a wrapper component that your screens utilize and **is meant to be used with [React Navigation](https://reactnavigation.org/)** as an action sheet.

## Props

### `onDismissed`

Optional callback that gets triggered when sheet is fully dismissed. This is called whenever the sheet is dismissed, which also includes dismissing via tapping on the overlay and swipe to dismiss.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| function                                            | No                                                      |

### `isInteractable`

Boolean that indicates if sheet is swippable. This affects whether or not tapping on the overlay will dismiss the sheet as well.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | true                                                   |

### `reservedMinOverlayHeight`

Optional number for the minimum spacing reserved for the overlay tappable area.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| number                                              | No                                                      | 250                                                    |

### `children`

Content to wrap in sheet.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | Yes                                                     |

## Methods

### `hide()`

Calling `hide` automatically navigates back once hide animation is complete. In other words, you do not need to call `navigation.goBack()` manually since this is already handled under the hood. The `hide` method takes an optional callback, which gets triggered after the sheet has fully dismissed.

```javascript
hide(callback: () => void)
```

| <span style="color:gray;font-size:14px">PARAMETERS</span> | <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">DESCRIPTION</span> |
| :-------------------------------------------------------- | :-------------------------------------------------- | :--------------------------------------------------------- |
| callback                                                  | function                                            | Callback to trigger after the sheet has fully dismissed.   |

## Usage

```javascript
// Update to import from relative paths
import SheetBottom, {
  SheetBottomRef,
} from 'app/component-library/components/SheetBottom/index.ts';

const NavigationScreen = () => {
  const bottomSheetRef = useRef<SheetBottomRef | undefined>();

  // Calling hide automatically navigates back once hide animation is complete. Hide takes an optional callback, which gets triggered after the sheet has fully dismissed.
  const onConfirm = () => bottomSheetRef.current?.hide?.(() => {
    // Code to process after sheet has fully dismissed.
  });

  return (
    <SheetBottom ref={bottomSheetRef} onDismissed={ONDISMISS_CALLBACK}>
      <SampleContent onPress={onConfirm} />
    </SheetBottom>
  );
};
```
