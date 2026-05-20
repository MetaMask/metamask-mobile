import React from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { ARBITRUM_USDC, PERPS_CURRENCY } from '../../../constants/perps';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { selectMetaMaskPayFlags } from '../../../../../../selectors/featureFlagController/confirmations';

export function PerpsDepositInfo() {
  useNavbar(strings('confirm.title.perps_deposit'));

  useAddToken({
    chainId: CHAIN_IDS.ARBITRUM,
    decimals: ARBITRUM_USDC.decimals,
    name: ARBITRUM_USDC.name,
    symbol: ARBITRUM_USDC.symbol,
    tokenAddress: ARBITRUM_USDC.address,
  });

  const { enablePerpsMoneyAccountTransactions } = useSelector(
    selectMetaMaskPayFlags,
  );

  return (
    <CustomAmountInfo
      currency={PERPS_CURRENCY}
      hasMax
      supportPerpsFromSelection={enablePerpsMoneyAccountTransactions}
    />
  );
}
