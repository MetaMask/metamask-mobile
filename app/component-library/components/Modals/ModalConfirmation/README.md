# ModalConfirmation

ModalConfirmation is a modal component typically used when confirmation options are needed. This component **is meant to be used with [React Navigation](https://reactnavigation.org/)** as a modal and is already pre-wired in the navigation stack.

## Props

### `route`

Object that holds the props that are passed in while navigating. Props are accessible through `route.params`. Refer to the [Usage](#usage) section below for reference.

| <span style="color:gray;font-size:14px">TYPE</span>       | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------------- | :------------------------------------------------------ |
| [ModalConfirmationRoute](./ModalConfirmation.types.ts#L6) | Yes                                                     |

## Usage

```javascript
// Update to import from relative paths.
import Routes from 'app/constants/navigation/Routes.ts';
import { ModalConfirmationVariants } from 'app/component-library/components/Modals/ModalConfirmation/index.ts';

navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
  screen: Routes.MODAL.MODAL_CONFIRMATION,
  params: {
    variant: ModalConfirmationVariants.Normal,
    title: TITLE_LABEL,
    description: DESCRIPTION_LABEL,
    onConfirm: ONCONFIRM_CALLBACK,
    onCancel: ONCANCEL_CALLBACK,
    cancelLabel: CANCEL_LABEL,
    confirmLabel: CONFIRM_LABEL,
  },
});
```
