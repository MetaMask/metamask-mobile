import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';

import type { RootState } from '../../../../../../reducers';
import {
  selectDepositLimits,
  selectMetaMaskPayFiatFlags,
  selectMetaMaskPayFlags,
  selectMetaMaskPayHardwareFlags,
  selectMetaMaskPayTokensFlags,
  selectPayQuoteConfig,
  selectPrefilledAmountConfig,
  selectRelayFixedSpread,
} from '../../../../../../selectors/featureFlagController/confirmations';

export function useMmPayFlagsDebug(transactionType?: TransactionType) {
  const metaMaskPayFlags = useSelector(selectMetaMaskPayFlags);
  const metaMaskPayTokensFlags = useSelector(selectMetaMaskPayTokensFlags);
  const payQuoteConfig = useSelector((state: RootState) =>
    selectPayQuoteConfig(state, transactionType),
  );
  const metaMaskPayFiatFlags = useSelector(selectMetaMaskPayFiatFlags);
  const metaMaskPayHardwareFlags = useSelector(selectMetaMaskPayHardwareFlags);
  const relayFixedSpread = useSelector(selectRelayFixedSpread);
  const depositLimits = useSelector(selectDepositLimits);
  const prefilledAmountConfig = useSelector((state: RootState) =>
    selectPrefilledAmountConfig(state, transactionType),
  );

  return {
    metaMaskPayFlags,
    metaMaskPayTokensFlags,
    payQuoteConfig,
    metaMaskPayFiatFlags,
    metaMaskPayHardwareFlags,
    relayFixedSpread,
    depositLimits,
    prefilledAmountConfig,
  };
}
