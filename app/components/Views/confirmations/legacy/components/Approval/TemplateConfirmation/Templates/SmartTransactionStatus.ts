import { ApprovalRequest } from '@metamask/approval-controller';
import { Actions } from '../TemplateConfirmation';
import { ConfirmationTemplateValues, ConfirmationTemplate } from '.';

function getValues(
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pendingApproval: ApprovalRequest<any>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  strings: (key: string, params?: Record<string, string>) => string,
  actions: Actions,
): ConfirmationTemplateValues {
  return {
    content: [
      {
        key: 'smart-transaction-status',
        // Added component to safe list: app/components/UI/TemplateRenderer/SafeComponentList.ts
        // app/components/Views/SmartTransactionStatus/smart-transaction-status.tsx
        element: 'SmartTransactionStatus',
        props: {
          requestState: pendingApproval.requestState,
          origin: pendingApproval.origin,
          onConfirm: actions.onConfirm,
        },
      },
    ],
    onConfirm: () => actions.onConfirm,
    onCancel: () => {
      // Need to stub out onCancel, otherwise the status modal will dismiss once the tx is complete
      // This is called when the stx is done for some reason, ALSO called when user swipes down
      // Cannot do onConfirm(), it will dismiss the status modal after tx complete, we want to keep it up after success
    },
    hideCancelButton: true,
    hideSubmitButton: true,
  };
}

const smartTransactionStatus: ConfirmationTemplate = {
  getValues,
};

export default smartTransactionStatus;
