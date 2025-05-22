import React from 'react';

import { strings } from '../../../../../locales/i18n';
import { useBatchApproveBalanceChanges } from '../../../Views/confirmations/hooks/7702/useBatchApproveBalanceChanges';
import BalanceChangeRow from '../BalanceChangeRow/BalanceChangeRow';
import { AssetType, BalanceChange } from '../types';

const BatchApprovalRow = () => {
  const { value: approveBalanceChanges } =
    useBatchApproveBalanceChanges() ?? {};

  if (!approveBalanceChanges?.length) {
    return null;
  }

  return (
    <>
      {approveBalanceChanges.map((balanceChange) => (
        <BalanceChangeRow
          enableEdit={balanceChange.asset.type === AssetType.ERC20}
          balanceChange={balanceChange as BalanceChange}
          label={strings('confirm.simulation.label_change_type_approve')}
        />
      ))}
    </>
  );
};

export default BatchApprovalRow;
