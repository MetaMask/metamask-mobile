import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  getFormattedAddressFromInternalAccount,
  isNonEvmAddress,
} from '../../../core/Multichain/utils';
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
import { RootState } from '../../../reducers';
import {
  selectNonEvmAccountBalanceByAddress,
  selectMultichainCoinRates,
  selectMultichainAssets,
  selectMultichainBalances,
  selectMultichainAssetsRates,
} from '../../../selectors/multichain/multichain';
import { formatWithThreshold } from '../../../util/assets';
// eslint-disable-next-line import/no-extraneous-dependencies
import I18n from 'i18n-js';
import BigNumberJS from 'bignumber.js';
import { parseCaipAssetType } from '@metamask/utils';

interface AccountInfo {
  [address: string]: AccountInformation;
}

export const getAccountBalances = ({
  internalAccount,
  accountInfoByAddress,
  totalFiatBalancesCrossChain,
  conversionRate,
  currentCurrency,
  state,
}: {
  internalAccount: InternalAccount;
  accountInfoByAddress: AccountInfo;
  totalFiatBalancesCrossChain: TotalFiatBalancesCrossChains;
  conversionRate: number | null | undefined;
  currentCurrency: string;
  state?: RootState;
}) => {
  const formattedAddress =
    getFormattedAddressFromInternalAccount(internalAccount);

  // Check if this is a non-EVM address (e.g., Solana)
  const isNonEvm = isNonEvmAddress(formattedAddress);

  let balanceETH = '0';
  let balanceFiat = '';
  let balanceWeiHex = '0x0';

  // Handle non-EVM accounts (Solana, etc.)
  if (isNonEvm && state) {
    // Get non-EVM balances using the selector
    const nonEvmBalances = selectNonEvmAccountBalanceByAddress(
      state,
      internalAccount.address,
    );

    if (nonEvmBalances) {
      // Using the first available balance for display
      const firstNetworkBalance = Object.values(nonEvmBalances)[0];
      if (firstNetworkBalance) {
        // Get the chain ID from the first balance
        const chainId = firstNetworkBalance.chainId;

        // Now we need to get the aggregate balance for this account with this chain
        // This is similar to how selectMultichainNetworkAggregatedBalance works
        // but for a specific account rather than the selected account

        const multichainBalances = selectMultichainBalances(state);
        const multichainAssets = selectMultichainAssets(state);
        const multichainAssetsRates = selectMultichainAssetsRates(state);

        // We need to manually calculate the aggregated balance for this specific account
        let totalNativeBalance = '0';
        let totalFiatValue = new BigNumberJS(0);

        // Get the account assets and balances
        const assetIds = multichainAssets?.[internalAccount.id] || [];
        const balancesForAccount = multichainBalances?.[internalAccount.id];

        if (balancesForAccount && assetIds.length > 0) {
          // Filter assets for the current chain and calculate total
          for (const assetId of assetIds) {
            try {
              const { chainId: assetChainId } = parseCaipAssetType(assetId);

              // Only include assets for the current chain
              if (assetChainId === chainId) {
                const balance = balancesForAccount[assetId] || {
                  amount: '0',
                  unit: '',
                };
                const rate = multichainAssetsRates?.[assetId]?.rate || '0';

                // Add to the native balance total
                totalNativeBalance = new BigNumberJS(totalNativeBalance)
                  .plus(balance.amount || '0')
                  .toString();

                // Add to the fiat value total
                const balanceInFiat = new BigNumberJS(
                  balance.amount || '0',
                ).times(rate);
                totalFiatValue = totalFiatValue.plus(balanceInFiat);
              }
            } catch (error) {
              // Skip invalid asset IDs
              continue;
            }
          }
        }

        // Use the token unit/symbol for display
        const tokenUnit =
          firstNetworkBalance.unit ||
          internalAccount.type.split(':')[0].toUpperCase();

        // Set the native balance - use only the native token balance for display
        // Instead of the total aggregate balance we calculated
        balanceETH = firstNetworkBalance.amount;

        // Keep the aggregate fiat calculation the same
        // Get conversion rates for native token as fallback
        const coinRates = selectMultichainCoinRates(state);
        let tokenConversionRate;
        if (tokenUnit && coinRates?.[tokenUnit.toLowerCase()]?.conversionRate) {
          tokenConversionRate =
            coinRates[tokenUnit.toLowerCase()].conversionRate;
        }

        // If we have a calculated total fiat value, use it
        if (!totalFiatValue.isZero()) {
          balanceFiat = formatWithThreshold(
            totalFiatValue.toNumber(),
            0,
            I18n.locale,
            {
              style: 'currency',
              currency: currentCurrency.toUpperCase(),
            },
          );
        }
        // Otherwise try with the conversion rate (using native token only)
        else if (balanceETH && tokenConversionRate) {
          const fiatValue = new BigNumberJS(balanceETH).times(
            tokenConversionRate,
          );
          balanceFiat = formatWithThreshold(
            fiatValue.toNumber(),
            0,
            I18n.locale,
            {
              style: 'currency',
              currency: currentCurrency.toUpperCase(),
            },
          );
        }
        // Last resort: use aggregated fiat balance from portfolio
        else {
          const totalFiatBalance =
            totalFiatBalancesCrossChain[internalAccount?.address]
              ?.totalFiatBalance;

          if (totalFiatBalance !== undefined) {
            balanceFiat = formatWithThreshold(
              totalFiatBalance,
              0,
              I18n.locale,
              {
                style: 'currency',
                currency: currentCurrency.toUpperCase(),
              },
            );
          } else {
            // If no fiat conversion is available, just show empty string
            balanceFiat = '';
          }
        }

        return {
          balanceETH,
          balanceFiat,
          balanceWeiHex,
          nonEvmBalance: true,
          tokenUnit,
        };
      }
    }
  }

  // Default EVM balance handling
  const balanceWeiHexEvm =
    accountInfoByAddress?.[formattedAddress]?.balance || '0x0';
  const stakedBalanceWeiHex =
    accountInfoByAddress?.[formattedAddress]?.stakedBalance || '0x0';
  const totalBalanceWeiHex = BigNumber.from(balanceWeiHexEvm)
    .add(BigNumber.from(stakedBalanceWeiHex))
    .toHexString();
  balanceETH = renderFromWei(totalBalanceWeiHex); // Gives ETH
  balanceWeiHex = totalBalanceWeiHex;

  // IF portfolio view is active, display aggregated fiat balance cross chains
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
    nonEvmBalance: false,
    tokenUnit: null,
  };
};
