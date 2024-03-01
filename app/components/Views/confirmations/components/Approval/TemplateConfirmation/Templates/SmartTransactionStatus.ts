import { ApprovalRequest } from '@metamask/approval-controller';
import { Actions } from '../TemplateConfirmation';
import { ConfirmationTemplateValues, ConfirmationTemplate } from '.';
import Logger from '../../../../../../../util/Logger';
import Engine from '../../../../../../../core/Engine';

function getValues(
  pendingApproval: ApprovalRequest<any>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  strings: (key: string, params?: Record<string, string>) => string,
  actions: Actions,
): ConfirmationTemplateValues {
  Logger.log('STX SmartTransactionStatus pendingApproval', pendingApproval);
  return {
    content: [
      {
        key: 'smart-transaction-status',
        // Added component to safe list: app/components/UI/TemplateRenderer/SafeComponentList.ts
        // app/components/Views/SmartTransactionStatus/smart-transaction-status.tsx
        element: 'SmartTransactionStatus',
        props: {
          requestState: pendingApproval.requestState,
          pendingApprovalId: pendingApproval.id,
          origin: pendingApproval.origin,
          onConfirm: actions.onConfirm,
        },
      },
    ],
    onConfirm: () => {
      Logger.log('STX SmartTransactionStatus onConfirm DUMMY');
    },
    onCancel: () => {
      // Cannot do onConfirm(), it will dismiss the status modal after tx complete, we want to keep it up after success
      // However, we want to handle swipe down during in progress STX
      // Remove the loading spinner on swipe down
      Engine.context.ApprovalController.endFlow({ id: pendingApproval.id });

      // // Need onCancel() to handle swipe down
      // actions.onConfirm();
      // Logger.log('STX SmartTransactionStatus onCancel');
    },
  };
}

const smartTransactionStatus: ConfirmationTemplate = {
  getValues,
};

export default smartTransactionStatus;
