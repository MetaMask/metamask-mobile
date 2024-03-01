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
    onConfirm: () => actions.onConfirm,
    onCancel: () => {
      // This is called when the stx is done for some reason, ALSO called when user swipes down
      // Cannot do onConfirm(), it will dismiss the status modal after tx complete, we want to keep it up after success

      try {
        // Remove the loading spinner on swipe down if tx is in progress
        // If swipe down after tx success an error is thrown b/c app/util/smart-transactions/smart-tx.ts ends the flow if tx success, so just catch
        Engine.context.ApprovalController.endFlow({ id: pendingApproval.id });
        Logger.log('STX SmartTransactionStatus onCancel');
      } catch (e) {
        Logger.log('STX SmartTransactionStatus onCancel error', e);
      }
    },
  };
}

const smartTransactionStatus: ConfirmationTemplate = {
  getValues,
};

export default smartTransactionStatus;
