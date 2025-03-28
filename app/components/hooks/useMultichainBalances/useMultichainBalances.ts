/* eslint-disable arrow-body-style */
import { useSelector } from 'react-redux';
import { useMemo, useCallback } from 'react';
import Engine from '../../../core/Engine';
import { isTestNet, isPortfolioViewEnabled } from '../../../util/networks';
import {
  selectChainId,
  selectIsPopularNetwork,
  selectEvmTicker,
} from '../../../selectors/networkController';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { selectIsTokenNetworkFilterEqualCurrentNetwork } from '../../../selectors/preferencesController';
import {
  selectSelectedInternalAccount,
  selectInternalAccounts,
} from '../../../selectors/accountsController';
import { getChainIdsToPoll } from '../../../selectors/tokensController';
import { useGetFormattedTokensPerChain } from '../useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../useGetTotalFiatBalanceCrossChains';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  UseMultichainBalancesHook,
  MultichainBalancesData,
} from './useMultichainBalances.types';
import { formatWithThreshold } from '../../../util/assets';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import {
  selectMultichainShouldShowFiat,
  selectMultichainConversionRate,
  selectMultichainBalances,
  selectMultichainAssets,
  selectMultichainAssetsRates,
  MULTICHAIN_NETWORK_TO_ASSET_TYPES,
} from '../../../selectors/multichain';
import { selectSelectedNonEvmNetworkChainId } from '../../../selectors/multichainNetworkController';
import { parseCaipAssetType } from '@metamask/utils';
///: END:ONLY_INCLUDE_IF
import I18n from '../../../../locales/i18n';
import { BigNumber } from 'bignumber.js';

/**
 * Hook to manage portfolio balance data across chains.
 *
 * @returns Portfolio balance data
 */
const useMultichainBalances = (): UseMultichainBalancesHook => {
  // Common selectors
  const internalAccounts = useSelector(selectInternalAccounts);
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const chainId = useSelector(selectChainId);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const allChainIDs = useSelector(getChainIdsToPoll);
  const isTokenNetworkFilterEqualCurrentNetwork = useSelector(
    selectIsTokenNetworkFilterEqualCurrentNetwork,
  );
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const ticker = useSelector(selectEvmTicker);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const shouldShowFiat = useSelector(selectMultichainShouldShowFiat);
  const multichainConversionRate = useSelector(selectMultichainConversionRate);
  const nonEvmNetworkChainId = useSelector(selectSelectedNonEvmNetworkChainId);
  const multichainBalances = useSelector(selectMultichainBalances);
  const multichainAssets = useSelector(selectMultichainAssets);
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  ///: END:ONLY_INCLUDE_IF

  // Production hooks (EVM)
  const formattedTokensWithBalancesPerChain = useGetFormattedTokensPerChain(
    internalAccounts,
    !isTokenNetworkFilterEqualCurrentNetwork && isPopularNetwork,
    allChainIDs,
  );

  const totalFiatBalancesCrossChain = useGetTotalFiatBalanceCrossChains(
    internalAccounts,
    formattedTokensWithBalancesPerChain,
  );

  // Helper function to calculate EVM balance for a specific account
  const calculateEvmBalance = useCallback(
    (account: InternalAccount): MultichainBalancesData => {
      // Get the ETH balance from AccountTrackerController for this specific account
      const { accountsByChainId } =
        Engine.context.AccountTrackerController.state;
      const accountHexAddress = account.address.toLowerCase();

      // Ensure we're using the correct chain ID format for EVM
      const evmChainId = chainId.startsWith('0x')
        ? chainId
        : `0x${parseInt(chainId).toString(16)}`;

      // Get the balance, checking both formats of chain ID to be safe
      const ethBalance =
        accountsByChainId?.[evmChainId]?.[accountHexAddress]?.balance ||
        accountsByChainId?.[chainId]?.[accountHexAddress]?.balance ||
        '0x0';

      // Convert from hex to decimal for display purposes
      let nativeAmount = '0';
      try {
        // Check if we have a valid balance
        if (ethBalance && ethBalance !== '0x0') {
          // For a proper conversion from hex to ETH amount we need to:
          // 1) Remove '0x' prefix if present and ensure we have a valid hex string
          const cleanHex = ethBalance.toLowerCase().replace('0x', '');
          // 2) Convert hex to BigNumber maintaining full precision
          const wei = new BigNumber(cleanHex, 16);
          // 3) Convert from wei to ETH (divide by 10^18)
          const ethValue = wei.dividedBy(new BigNumber(10).pow(18));

          // Format the value appropriately
          if (ethValue.isZero()) {
            nativeAmount = '0';
          } else if (ethValue.isLessThan(0.000001)) {
            // For very small values, show more decimals
            nativeAmount = ethValue.toFixed(8);
          } else {
            // For normal values, show reasonable precision
            nativeAmount = ethValue.toFixed(6);
          }

          // Remove trailing zeros after decimal point
          nativeAmount = nativeAmount.replace(/\.?0+$/, '');
          if (nativeAmount === '') nativeAmount = '0';
        }
      } catch (e) {
        console.error('Error converting ETH balance:', e);
        nativeAmount = '0';
      }

      // Get account-specific portfolio data if available
      const accountData = totalFiatBalancesCrossChain[accountHexAddress] || {
        tokenFiatBalancesCrossChains: [],
        totalFiatBalance: 0,
        totalTokenFiat: 0,
      };

      // Get total ETH + token balance in fiat
      let ethFiat = 0;
      let tokenFiat = 0;
      let totalFiat = 0;

      // Find the current chain data, checking both chain ID formats
      const currentChainData = accountData.tokenFiatBalancesCrossChains.find(
        (chainData) =>
          chainData.chainId === evmChainId || chainData.chainId === chainId,
      );

      if (currentChainData) {
        ethFiat = currentChainData.nativeFiatValue || 0;
        tokenFiat = currentChainData.tokenFiatBalances.reduce(
          (sum, val) => sum + (val || 0),
          0,
        );
        totalFiat = ethFiat + tokenFiat;
      }

      // If we couldn't get the data from cross-chain info, fallback to a direct calculation
      if (totalFiat === 0) {
        // Get conversion rate
        const { currencyRates } = Engine.context.CurrencyRateController.state;
        const conversionRate = currencyRates?.[ticker]?.conversionRate || 0;

        // Estimate ETH value
        if (nativeAmount && nativeAmount !== '0') {
          ethFiat = parseFloat(nativeAmount) * conversionRate;
          totalFiat = ethFiat;
        }

        // Also calculate token values if possible
        tokenFiat = accountData.totalTokenFiat || 0;
        totalFiat += tokenFiat;
      }

      // Format for display
      const displayBalance = formatWithThreshold(totalFiat, 0, I18n.locale, {
        style: 'currency',
        currency: currentCurrency.toUpperCase(),
      });

      return {
        nativeTokenBalance: {
          amount: nativeAmount,
          unit: ticker || 'ETH',
        },
        totalBalanceFiat: totalFiat.toString(),
        displayBalance,
        displayCurrency: currentCurrency,
        tokenFiatBalancesCrossChains: accountData.tokenFiatBalancesCrossChains,
        totalFiatBalance: totalFiat,
        totalTokenFiat: tokenFiat,
        shouldShowAggregatedPercentage: !isTestNet(chainId),
        isPortfolioVieEnabled: isPortfolioViewEnabled(),
        aggregatedBalance: {
          ethFiat,
          tokenFiat,
          tokenFiat1dAgo: tokenFiat,
          ethFiat1dAgo: ethFiat,
        },
        accountBalances: {},
      };
    },
    [chainId, ticker, currentCurrency, totalFiatBalancesCrossChain],
  );

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  // Helper function to calculate non-EVM balance for a specific account
  const calculateNonEvmBalance = useCallback(
    (account: InternalAccount): MultichainBalancesData => {
      // Default values
      const defaultNativeTokenBalance = { amount: '0', unit: '' };

      if (!nonEvmNetworkChainId) {
        return {
          nativeTokenBalance: defaultNativeTokenBalance,
          totalBalanceFiat: '0',
          displayBalance: undefined,
          displayCurrency: currentCurrency,
          tokenFiatBalancesCrossChains: [],
          totalFiatBalance: 0,
          totalTokenFiat: 0,
          shouldShowAggregatedPercentage: false,
          isPortfolioVieEnabled: isPortfolioViewEnabled(),
          aggregatedBalance: {
            ethFiat: 0,
            tokenFiat: 0,
            tokenFiat1dAgo: 0,
            ethFiat1dAgo: 0,
          },
          accountBalances: {},
        };
      }

      // Process the account's assets and balances
      const assetIds = multichainAssets?.[account.id] || [];
      const balances = multichainBalances?.[account.id] || {};

      // Find the native asset for this chain
      const nativeAsset =
        MULTICHAIN_NETWORK_TO_ASSET_TYPES[nonEvmNetworkChainId]?.[0];

      // Default values for native token
      let nativeTokenBalance = defaultNativeTokenBalance;
      let totalBalanceFiat = new BigNumber(0);

      // Process each asset
      for (const assetId of assetIds) {
        const { chainId: assetChainId } = parseCaipAssetType(assetId);

        if (assetChainId !== nonEvmNetworkChainId) {
          continue;
        }

        const balance = balances[assetId] || { amount: '0', unit: '' };

        // Safely handle undefined rate
        const rate = multichainAssetsRates?.[assetId]?.rate;
        const balanceInFiat =
          balance.amount && rate
            ? new BigNumber(balance.amount).times(rate)
            : new BigNumber(0);

        // Only update native token balance if this is the native asset
        if (assetId === nativeAsset) {
          nativeTokenBalance = {
            amount: balance.amount || '0',
            unit: balance.unit || '',
          };
        }

        // Always add to total fiat balance
        totalBalanceFiat = totalBalanceFiat.plus(balanceInFiat);
      }

      // Generate display balance
      let displayBalance: string | undefined;

      if (!shouldShowFiat) {
        displayBalance = `${nativeTokenBalance.amount} ${nativeTokenBalance.unit}`;
      } else if (totalBalanceFiat && multichainConversionRate) {
        displayBalance = formatWithThreshold(
          parseFloat(totalBalanceFiat.toString()),
          0,
          I18n.locale,
          {
            style: 'currency',
            currency: currentCurrency.toUpperCase(),
          },
        );
      } else if (nativeTokenBalance.amount) {
        displayBalance = `${nativeTokenBalance.amount} ${nativeTokenBalance.unit}`;
      }

      return {
        nativeTokenBalance,
        totalBalanceFiat: totalBalanceFiat.toString(),
        displayBalance,
        displayCurrency: currentCurrency,
        tokenFiatBalancesCrossChains: [],
        totalFiatBalance: parseFloat(totalBalanceFiat.toString()),
        totalTokenFiat: 0,
        shouldShowAggregatedPercentage: !isTestNet(nonEvmNetworkChainId),
        isPortfolioVieEnabled: isPortfolioViewEnabled(),
        aggregatedBalance: {
          ethFiat: 0,
          tokenFiat: 0,
          tokenFiat1dAgo: 0,
          ethFiat1dAgo: 0,
        },
        accountBalances: balances,
      };
    },
    [
      nonEvmNetworkChainId,
      currentCurrency,
      multichainAssets,
      multichainBalances,
      multichainAssetsRates,
      multichainConversionRate,
      shouldShowFiat,
    ],
  );
  ///: END:ONLY_INCLUDE_IF

  // Compute balances for all accounts
  const allAccountBalances = useMemo(() => {
    return internalAccounts.reduce((acc, account) => {
      // Determine account type by its structure
      const isSolanaAccount = account.type === 'solana:data-account';
      const isBitcoinAccount = account.type === 'bip122:p2wpkh';
      const isNonEvmAccount = isSolanaAccount || isBitcoinAccount;

      if (isNonEvmAccount) {
        // For non-EVM networks (Solana, Bitcoin), use non-EVM balance calculation
        acc[account.id] = calculateNonEvmBalance(account);
      } else {
        // For EVM networks, use EVM balance calculation
        acc[account.id] = calculateEvmBalance(account);
      }
      return acc;
    }, {} as Record<string, MultichainBalancesData>);
  }, [internalAccounts, calculateEvmBalance, calculateNonEvmBalance]);

  // Get the selected account's balance
  const selectedAccountMultichainBalance = useMemo(() => {
    if (!selectedInternalAccount) {
      return {
        displayBalance: undefined,
        displayCurrency: currentCurrency,
        tokenFiatBalancesCrossChains: [],
        totalFiatBalance: 0,
        totalTokenFiat: 0,
        shouldShowAggregatedPercentage: false,
        isPortfolioVieEnabled: isPortfolioViewEnabled(),
        aggregatedBalance: {
          ethFiat: 0,
          tokenFiat: 0,
          tokenFiat1dAgo: 0,
          ethFiat1dAgo: 0,
        },
        nativeTokenBalance: { amount: '0', unit: '' },
        accountBalances: {},
      };
    }

    return allAccountBalances[selectedInternalAccount.id];
  }, [selectedInternalAccount, allAccountBalances, currentCurrency]);

  return {
    multichainBalancesForAllAccounts: allAccountBalances,
    selectedAccountMultichainBalance,
  };
};

export default useMultichainBalances;
