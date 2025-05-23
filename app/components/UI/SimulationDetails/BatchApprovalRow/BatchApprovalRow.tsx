import React from 'react';

import { strings } from '../../../../../locales/i18n';
import { useBatchApproveBalanceChanges } from '../../../Views/confirmations/hooks/7702/useBatchApproveBalanceChanges';
import { useBatchApproveBalanceActions } from '../../../Views/confirmations/hooks/7702/useBatchApproveBalanceActions';
import BalanceChangeRow from '../BalanceChangeRow/BalanceChangeRow';
import { AssetType, BalanceChange } from '../types';

const BatchApprovalRow = () => {
  const { value: approveBalanceChanges } =
    useBatchApproveBalanceChanges() ?? {};

  const { onApprovalAmountUpdate } = useBatchApproveBalanceActions();

  if (!approveBalanceChanges?.length) {
    return null;
  }

  return (
    <>
      {approveBalanceChanges.map((balanceChange) => (
        <BalanceChangeRow
          balanceChange={balanceChange as BalanceChange}
          enableEdit={balanceChange.asset.type === AssetType.ERC20}
          label={strings('confirm.simulation.label_change_type_approve')}
          onUpdate={onApprovalAmountUpdate}
        />
      ))}
    </>
  );
};

export default BatchApprovalRow;
