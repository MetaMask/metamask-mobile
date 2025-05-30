import React from 'react';

import { strings } from '../../../../../locales/i18n';
import { useBatchApproveBalanceChanges } from '../../../Views/confirmations/hooks/7702/useBatchApproveBalanceChanges';
import BalanceChangeRow from '../BalanceChangeRow/BalanceChangeRow';
import { BalanceChange } from '../types';

const BatchApprovalRow = () => {
  const { value: approveBalanceChanges } = useBatchApproveBalanceChanges();

  if (!approveBalanceChanges?.length) {
    return null;
  }

  return (
    <>
      {approveBalanceChanges.map((balanceChange, index) => (
        <BalanceChangeRow
          key={`batch_balance_change-${index}-${balanceChange}`}
          label={strings('confirm.simulation.label_change_type_approve')}
          balanceChange={balanceChange as BalanceChange}
        />
      ))}
    </>
  );
};

export default BatchApprovalRow;
