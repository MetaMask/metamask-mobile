import React from 'react';

import { strings } from '../../../../../locales/i18n';
import { useBatchApproveBalanceChanges } from '../../../Views/confirmations/hooks/7702/useBatchApproveBalanceChanges';
import { useBatchApproveBalanceActions } from '../../../Views/confirmations/hooks/7702/useBatchApproveBalanceActions';
import BalanceChangeRow from '../BalanceChangeRow/BalanceChangeRow';
import { AssetType, BalanceChange } from '../types';

const ApprovalEditTexts = {
  title: strings('confirm.simulation.edit_approval_limit_title'),
  description: strings('confirm.simulation.edit_approval_limit_description'),
};

const BatchApprovalRow = () => {
  const { value: approveBalanceChanges } =
    useBatchApproveBalanceChanges() ?? {};

  const { onApprovalAmountUpdate } = useBatchApproveBalanceActions();

  if (!approveBalanceChanges?.length) {
    return null;
  }

  return (
    <>
      {approveBalanceChanges.map((balanceChange, index) => (
        <BalanceChangeRow
          key={`batch_balance_change-${index}-${balanceChange}`}
          balanceChange={balanceChange as BalanceChange}
          enableEdit={balanceChange.asset.type === AssetType.ERC20}
          editTexts={ApprovalEditTexts}
          label={strings('confirm.simulation.label_change_type_approve')}
          onUpdate={onApprovalAmountUpdate}
        />
      ))}
    </>
  );
};

export default BatchApprovalRow;
