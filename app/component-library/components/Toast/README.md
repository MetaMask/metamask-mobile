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
    <SampleRootComponent />
  </ToastContextWrapper>
);
```

2. Implement `Toast` component within a child of the root element and apply `toastRef` from `ToastContext`.

```javascript
// Replace import with relative path.
import Toast, { ToastContext } from 'app/component-library/components/Toast';

const SampleRootComponent = () => {
  const { toastRef } = useContext(ToastContext);

  return (
    <>
      <SampleContent />
      <Toast ref={toastRef} />
    </>
  );
};
```

3. Reference `toastRef` and call `toastRef.current?.showToast(...)` to show toast.

```javascript
// Replace import with relative path.
import {
  ToastContext,
  ToastVariants,
} from 'app/component-library/components/Toast';

const { toastRef } = useContext(ToastContext);

const showToast = () => {
  // Example of showing toast with Account variant.
  toastRef.current?.showToast({
    variant: ToastVariants.Account,
    labelOptions: [
      { label: LABEL_CHUNK_1 },
      { label: LABEL_CHUNK_2, isBold: true },
    ],
    accountAddress: ACCOUNT_ADDRESS,
    accountAvatarType: ACCOUNT_AVATAR_TYPE,
    linkButtonOptions: {
      label: LINK_LABEL,
      onPress: ONPRESS_HANDLER,
    },
  });
};
```
