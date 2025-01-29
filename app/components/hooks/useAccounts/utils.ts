import { InternalAccount } from '@metamask/keyring-internal-api';
import { getFormattedAddressFromInternalAccount } from '../../../core/Multichain/utils';
import { BigNumber } from 'ethers';
import {
  hexToBN,
  renderFiat,
  renderFromWei,
  weiToFiat,
} from '../../../util/number';
import { AccountInformation } from '@metamask/assets-controllers';
import { TotalFiatBalancesCrossChains } from '../useGetTotalFiatBalanceCrossChains';
import { isPortfolioViewEnabled } from '../../../util/networks';

interface AccountInfo {
  [address: string]: AccountInformation;
}

export const getAccountBalances = ({
  internalAccount,
  accountInfoByAddress,
  totalFiatBalancesCrossChain,
  conversionRate,
  currentCurrency,
}: {
  internalAccount: InternalAccount;
  accountInfoByAddress: AccountInfo;
  totalFiatBalancesCrossChain: TotalFiatBalancesCrossChains;
  conversionRate: number | null | undefined;
  currentCurrency: string;
}) => {
  const formattedAddress =
    getFormattedAddressFromInternalAccount(internalAccount);
  const balanceWeiHex =
    accountInfoByAddress?.[formattedAddress]?.balance || '0x0';
  const stakedBalanceWeiHex =
    accountInfoByAddress?.[formattedAddress]?.stakedBalance || '0x0';
  const totalBalanceWeiHex = BigNumber.from(balanceWeiHex)
    .add(BigNumber.from(stakedBalanceWeiHex))
    .toHexString();
  const balanceETH = renderFromWei(totalBalanceWeiHex); // Gives ETH
  // IF portfolio view is active, display aggregated fiat balance cross chains
  let balanceFiat;
  if (isPortfolioViewEnabled()) {
    const totalFiatBalance =
      totalFiatBalancesCrossChain[internalAccount?.address as string]
        ?.totalFiatBalance;
    balanceFiat =
      totalFiatBalance !== undefined
        ? `${renderFiat(totalFiatBalance, currentCurrency)}`
        : '';
  } else {
    balanceFiat =
      weiToFiat(hexToBN(totalBalanceWeiHex), conversionRate, currentCurrency) ||
      '';
  }

  return {
    balanceETH,
    balanceFiat,
    balanceWeiHex,
  };
};
