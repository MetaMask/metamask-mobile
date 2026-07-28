import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { ARBITRUM_USDC, PERPS_CURRENCY } from '../../../constants/perps';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useDefaultPaySelectedSection } from '../../../hooks/pay/useDefaultPaySelectedSection';
import { useParams } from '../../../../../../util/navigation/navUtils';
import {
  ConfirmationParams,
  PayWithOption,
} from '../../confirm/confirm-component';
import { useMMPayVisualStatePicker } from '../../../debug/useMMPayVisualStatePicker';

export function PerpsDepositInfo() {
  const { payWithOption } = useParams<ConfirmationParams>({});
  const { navbarOverrides, sheet, forcedNavbarTitle } =
    useMMPayVisualStatePicker();

  const liveTitle =
    payWithOption === PayWithOption.MoneyAccount
      ? strings('perps.send_to_perps')
      : strings('confirm.title.perps_deposit');

  // Flow-specific error presets (e.g. withdraw) override the Add funds title.
  useNavbar(forcedNavbarTitle ?? liveTitle, true, navbarOverrides);
  useDefaultPaySelectedSection();

  useAddToken({
    chainId: CHAIN_IDS.ARBITRUM,
    decimals: ARBITRUM_USDC.decimals,
    name: ARBITRUM_USDC.name,
    symbol: ARBITRUM_USDC.symbol,
    tokenAddress: ARBITRUM_USDC.address,
  });

  return (
    <>
      <CustomAmountInfo currency={PERPS_CURRENCY} hasMax />
      {sheet}
    </>
  );
}
