// TODO: Temporary hook used until useMoneyAccountDeposit and useMoneyAccountWithdrawal
// are each extracted into their own dedicated hook files. Once done, we can rename this hook to useMoneyAccount.

import { useSelector } from 'react-redux';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyEnableMoneyAccountFlag } from '../selectors/featureFlags';

const useMoneyAccountInfo = () => {
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const isMoneyAccountFeatureEnabled = useSelector(
    selectMoneyEnableMoneyAccountFlag,
  );

  return {
    isMoneyAccountFeatureEnabled,
    hasMoneyAccount: Boolean(primaryMoneyAccount),
    primaryMoneyAccount,
  };
};

export default useMoneyAccountInfo;
