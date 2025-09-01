import React from 'react';

import { strings } from '../../../../../locales/i18n';
import { useBatchApproveBalanceChanges } from '../../../Views/confirmations/hooks/7702/useBatchApproveBalanceChanges';
import { useBatchApproveBalanceActions } from '../../../Views/confirmations/hooks/7702/useBatchApproveBalanceActions';
import InlineAlert from '../../../Views/confirmations/components/UI/inline-alert';
import { useAlerts } from '../../../Views/confirmations/context/alert-system-context';
import { RowAlertKey } from '../../../Views/confirmations/components/UI/info-row/alert-row/constants';
import BalanceChangeRow from '../BalanceChangeRow/BalanceChangeRow';
import { BalanceChange } from '../types';

const InlineAlertStyle = {
  width: 70,
  marginTop: -20,
  marginLeft: 0,
};

const BatchApprovalRow = () => {
  const { value: approveBalanceChanges } =
    useBatchApproveBalanceChanges() ?? {};
  const { fieldAlerts } = useAlerts();
  const alertSelected = fieldAlerts.find(
    (a) => a.field === RowAlertKey.BatchedApprovals,
  );

  const { onApprovalAmountUpdate } = useBatchApproveBalanceActions();

  if (!approveBalanceChanges?.length) {
    return null;
  }

  return (
    <>
      {approveBalanceChanges.map((balanceChange, index) => (
        <BalanceChangeRow
          approveMethod={balanceChange.approveMethod}
          key={`batch_balance_change-${index}-${balanceChange}`}
          balanceChange={balanceChange as BalanceChange}
          label={strings('confirm.simulation.label_change_type_approve')}
          onApprovalAmountUpdate={onApprovalAmountUpdate}
        />
      ))}
      {alertSelected && (
        <InlineAlert alertObj={alertSelected} style={InlineAlertStyle} />
      )}
    </>
  );
};

export default BatchApprovalRow;
