# ConfirmationModal

ConfirmationModal is a modal component typically used when confirmation options are needed. This component is meant to be used with React Navigation as a modal and is already pre-wired.

## Props

### `route`

Includes params passed via navigation.

- `route.params.variant` - Variant that determines the confirmation type.
- `route.params.title` - Title in modal.
- `route.params.description` - Description in modal.
- `route.params.onConfirm` - Callback after confirming.
- `route.params.onCancel` - Callback after canceling. Optional.
- `route.params.cancelLabel` - Cancel button label. Defaults to "Cancel". Optional.
- `route.params.confirmLabel` - Confirm button label. Defaults to "Confirmed". Optional.

| <span style="color:gray;font-size:14px">TYPE</span>       | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------------- | :------------------------------------------------------ |
| [ConfirmationModalRoute](./ConfirmationModal.types.ts#L6) | Yes                                                     |

## Usage

```javascript
// Update to import from relative paths
import Routes from 'app/constants/navigation/Routes.ts';
import { ConfirmationModalVariant } from 'app/component-library/components/ConfirmationModal/index.ts';

navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
  screen: Routes.MODAL.CONFIRMATION_MODAL,
  params: {
    variant: ConfirmationModalVariant.Normal,
    title: `Title!`,
    description: `I'm an example description`,
    onConfirm: () => {},
    onCancel: () => {}, // Optional
    cancelLabel: 'Cancel' // Optional
    confirmLabel: 'Confirm' // Optional
  },
});
```
