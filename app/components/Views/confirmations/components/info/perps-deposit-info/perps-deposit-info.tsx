import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import {
  ARBITRUM_USDC_ADDRESS,
  ARBITRUM_USDC_DECIMALS,
  ARBITRUM_USDC_SYMBOL,
  PERPS_CURRENCY,
} from '../../../constants/perps';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { CHAIN_IDS } from '@metamask/transaction-controller';

export function PerpsDepositInfo() {
  useNavbar(strings('confirm.title.perps_deposit'));

  useAddToken({
    chainId: CHAIN_IDS.ARBITRUM,
    tokenAddress: ARBITRUM_USDC_ADDRESS,
    symbol: ARBITRUM_USDC_SYMBOL,
    decimals: ARBITRUM_USDC_DECIMALS,
  });

  return <CustomAmountInfo currency={PERPS_CURRENCY} />;
}
