import React from 'react';
import { Text } from 'react-native';

import { strings } from '../../../../../../../../locales/i18n';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import FlatNavHeader from '../../FlatNavHeader';

const StakingDeposit = () => {
  const { onReject } = useConfirmActions();

  return (
    <>
      <FlatNavHeader title={strings('stake.stake')} onLeftPress={onReject} />
    </>
  );
};

export default StakingDeposit;
