import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { ConfirmationRowComponentIDs } from '../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { useApproveTransactionData } from '../../../../hooks/useApproveTransactionData';
import { selectUseTransactionSimulations } from '../../../../../../../selectors/preferencesController';
import { StaticSimulationApprove } from '../../../static-simulation-approve';
import { RawApprove } from '../../../raw-approve';

export const ApproveRow = () => {
  const approveTransactionData = useApproveTransactionData();
  const isSimulationEnabled = useSelector(selectUseTransactionSimulations);

  if (approveTransactionData.isLoading) {
    // Nice to have: Add loading component
    return null;
  }

  return (
    <View testID={ConfirmationRowComponentIDs.APPROVE_ROW}>
      {isSimulationEnabled ? <StaticSimulationApprove /> : <RawApprove />}
    </View>
  );
};
