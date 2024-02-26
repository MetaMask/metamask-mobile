import { ApprovalRequest } from '@metamask/approval-controller';
import { Actions } from '../TemplateConfirmation';
import { ConfirmationTemplateValues, ConfirmationTemplate } from '.';
import Logger from '../../../../../../../util/Logger';

function getValues(
  pendingApproval: ApprovalRequest<any>,
  strings: (key: string) => string,
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
        },
      },
    ],
    confirmText: strings('smart_transactions.view_activity'),
    onConfirm: actions.onConfirm,
    cancelText: strings('smart_transactions.return_to_dapp'),
    onCancel: () => {
      // TODO if I pass this in, then this component will stay on screen. This is b/c I'm getting "user rejected" for some reason
      // this is called every time it renders, but the actual useApprovalRequest.onReject is only called on swipe down
      // Logger.log('STX SmartTransactionStatus onCancel');
    },
  };
}

const smartTransactionStatus: ConfirmationTemplate = {
  getValues,
};

export default smartTransactionStatus;
