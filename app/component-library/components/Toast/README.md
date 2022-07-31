# Toast

Toast is a component that slides up from the bottom. It is typically used to show post confirmation information.

## Methods

### `showToast()`

```javascript
showToast(toastOptions: ToastOptions)
```

| <span style="color:gray;font-size:14px">PARAMETERS</span> | <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">DESCRIPTION</span> |
| :-------------------------------------------------------- | :-------------------------------------------------- | :--------------------------------------------------------- |
| toastOptions                                              | [ToastOptions](./Toast.types.ts#L36)                | Toast options to show.                                     |

## Use Case

Using this component requires a three step process:

1. Wrap a root element with `ToastContextWrapper`.

```javascript
// Replace import with relative path.
import { ToastContextWrapper } from 'app/component-library/components/Toast';

const App = () => (
  <ToastContextWrapper>
    <Root />
  </ToastContextWrapper>
);
```

2. Implement `Toast` component within a child of the root element and apply `toastRef` from `ToastContext`.

```javascript
// Replace import with relative path.
import Toast, { ToastContext } from 'app/component-library/components/Toast';

const Root = () => {
  const { toastRef } = useContext(ToastContext);

  return (
    <>
      <YourContent />
      <Toast ref={toastRef} />
    </>
  );
};
```

3. Reference `toastRef` and call `toastRef.current?.showToast(...)` to show toast.

```javascript
// Replace import with relative path.
import Toast, { ToastContext } from 'app/component-library/components/Toast';

const NestedComponent = () => {
  const { toastRef } = useContext(ToastContext);

  const showToast = () => {
    // Example of showing toast with Account variant.
    toastRef.current?.showToast({
      variant: ToastVariant.Account,
      labelOptions: [
        { label: 'Switching to' },
        { label: ' Account 2.', isBold: true },
      ],
      accountAddress:
        '0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092',
      linkOption: {
        label: 'Click here.',
        onPress: () => {},
      },
    });
  };

  return <TouchableOpacity onPress={showToast} />;
};
```
