import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { ARBITRUM_USDC, PERPS_CURRENCY } from '../../../constants/perps';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMoneyAccountPaymentOverride } from '../../../hooks/pay/useMoneyAccountPaymentOverride';
import { useParams } from '../../../../../../util/navigation/navUtils';
import {
  ConfirmationParams,
  PayWithOption,
} from '../../confirm/confirm-component';

export function PerpsDepositInfo() {
  const { payWithOption } = useParams<ConfirmationParams>({});
  const title =
    payWithOption === PayWithOption.MoneyAccount
      ? strings('perps.transfer_to_perps')
      : strings('confirm.title.perps_deposit');

  useNavbar(title);
  useMoneyAccountPaymentOverride();

  useAddToken({
    chainId: CHAIN_IDS.ARBITRUM,
    decimals: ARBITRUM_USDC.decimals,
    name: ARBITRUM_USDC.name,
    symbol: ARBITRUM_USDC.symbol,
    tokenAddress: ARBITRUM_USDC.address,
  });

  return <CustomAmountInfo currency={PERPS_CURRENCY} hasMax />;
}
