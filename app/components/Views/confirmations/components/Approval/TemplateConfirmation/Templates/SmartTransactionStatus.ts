import { ApprovalRequest } from '@metamask/approval-controller';
import { Actions } from '../TemplateConfirmation';
import { ConfirmationTemplateValues, ConfirmationTemplate } from '.';
import Logger from '../../../../../../../util/Logger';
import Engine from '../../../../../../../core/Engine';
import Routes from '../../../../../../../constants/navigation/Routes';
import TransactionTypes from '../../../../../../../core/TransactionTypes';

function getValues(
  pendingApproval: ApprovalRequest<any>,
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
          onConfirm: actions.onConfirm,
        },
      },
    ],
    confirmText: strings('smart_transactions.view_activity'),
    onConfirm: () => {
      actions.onConfirm();
      Engine.context.ApprovalController.endFlow({ id: pendingApproval.id });
      actions.navigation.navigate(Routes.TRANSACTIONS_VIEW);
    },
    cancelText:
      pendingApproval.origin === TransactionTypes.MMM
        ? strings('smart_transactions.return')
        : strings('smart_transactions.return_to_dapp', {
            dappName: pendingApproval.origin,
          }),
    onCancel: () => {
      actions.onConfirm();

      // Remove the loading spinner on swipe down
      Engine.context.ApprovalController.endFlow({ id: pendingApproval.id });
      Logger.log('STX SmartTransactionStatus onCancel');
    },
  };
}

const smartTransactionStatus: ConfirmationTemplate = {
  getValues,
};

export default smartTransactionStatus;
