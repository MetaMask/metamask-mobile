import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { AllowanceState } from '../types';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { SOLANA_MAINNET } from '../../Ramp/Deposit/constants/networks';
import Engine from '../../../../core/Engine';
import {
  addCurrencySymbol,
  balanceToFiatNumber,
} from '../../../../util/number';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { safeFormatChainIdToHex } from '../util/safeFormatChainIdToHex';
import { deriveBalanceFromAssetMarketDetails } from '../../Tokens/util';
import { TokenI } from '../../Tokens/types';
import { MarketDataDetails } from '@metamask/assets-controllers';
import { selectAsset } from '../../../../selectors/assets/assets-list';
import { SupportedTokenWithChain } from '../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';

export interface AssetBalanceInfo {
  balanceFiat: string;
  balanceFormatted: string;
  rawFiatNumber: number | undefined;
  rawTokenBalance: number | undefined;
}

/**
 * Hook to retrieve balance information for multiple tokens at once.
 * This is optimized for use cases like the Asset Selection Bottom Sheet
 * where we need to display balances for many tokens simultaneously.
 *
 * Balance logic:
 * - For enabled tokens (with delegation): shows availableBalance (min of remaining allowance and wallet balance)
 * - For non-enabled tokens: shows the user's actual wallet balance from their wallet
 */
export const useAssetBalances = (
  tokens: SupportedTokenWithChain[],
): Map<string, AssetBalanceInfo> => {
  const { MultichainAssetsRatesController, TokenRatesController } =
    Engine.context;
  const chainIds = [LINEA_CHAIN_ID, SOLANA_MAINNET.chainId];

  const tokensWithBalance = useTokensWithBalance({
    chainIds,
  });

  const currentCurrency = useSelector(selectCurrentCurrency);

  // Get all assets from wallet for fallback balance lookup
  const walletAssetsMap = useSelector((state: RootState) => {
    const map = new Map<string, TokenI>();
    tokens.forEach((token) => {
      if (token?.caipChainId && token?.address) {
        const isSolana = isSolanaChainId(token.caipChainId);
        const chainId = isSolana
          ? token.caipChainId
          : (safeFormatChainIdToHex(token.caipChainId) as string);

        const asset = selectAsset(state, {
          address: token.address,
          chainId,
        });

        if (asset) {
          // Key should use the same address used for balance lookups
          const key = `${token.address.toLowerCase()}-${token.caipChainId}`;
          map.set(key, asset);
        }
      }
    });
    return map;
  });

  // Get all exchange rates and token rates for EVM chains
  const exchangeRatesMap = useSelector((state: RootState) => {
    const map = new Map<
      string,
      { conversionRate: number; marketData: MarketDataDetails }
    >();
    tokens.forEach((token) => {
      if (token?.caipChainId && !isSolanaChainId(token.caipChainId)) {
        const chainId = safeFormatChainIdToHex(token.caipChainId) as Hex;
        const conversionRate =
          state.engine.backgroundState.CurrencyRateController.currencyRates[
            chainId
          ]?.conversionRate || 0;
        const marketData =
          TokenRatesController?.state?.marketData?.[chainId]?.[
            token.address?.toLowerCase() as Hex
          ];
        map.set(`${chainId}-${token.address?.toLowerCase()}`, {
          conversionRate,
          marketData,
        });
      }
    });
    return map;
  });

  // Create a map of asset balances
  const balancesMap = useMemo<Map<string, AssetBalanceInfo>>(() => {
    const map = new Map<string, AssetBalanceInfo>();

    tokens.forEach((token) => {
      if (!token?.caipChainId) {
        return;
      }

      // Create a unique key for this token
      const tokenKey = `${token.address?.toLowerCase()}-${token.caipChainId}-${token.walletAddress?.toLowerCase()}`;

      const isSolana = isSolanaChainId(token.caipChainId);

      // For balance lookups, use stagingTokenAddress if available (real on-chain address)
      // Otherwise use the regular address (which might be the delegation address in staging)

      // Try to get the asset from the selector
      const assetAddress = isSolana
        ? `${token.caipChainId}/token:${token.address}`
        : token.address?.toLowerCase();

      const assetChainId = isSolana
        ? token.caipChainId
        : safeFormatChainIdToHex(token.caipChainId);

      // Find the token in tokensWithBalance for non-enabled tokens
      const filteredToken = tokensWithBalance.find(
        (t) => t.address === assetAddress && t.chainId === token.caipChainId,
      );

      // Also check wallet assets as a fallback
      const walletAssetKey = `${token.address?.toLowerCase()}-${token.caipChainId}`;
      const walletAsset = walletAssetsMap.get(walletAssetKey);

      // Determine which balance to use:
      // - For enabled tokens: use availableBalance (min of remaining allowance and actual balance)
      // - For non-enabled tokens: use actual wallet balance
      let balanceToUse: string;
      if (
        token.allowanceState === AllowanceState.Enabled ||
        token.allowanceState === AllowanceState.Limited
      ) {
        // Token is enabled/delegated - use availableBalance
        // availableBalance is the minimum of remaining allowance and wallet balance
        // This is the correct spendable amount for card transactions
        balanceToUse =
          token.availableBalance ||
          filteredToken?.balance ||
          walletAsset?.balance ||
          '0';
      } else {
        // Token is not enabled - use actual wallet balance from tokensWithBalance
        // For non-enabled tokens, availableBalance is 0 even if user has balance
        // (because availableBalance = min(balance, allowance) and allowance is 0)
        balanceToUse = filteredToken?.balance || walletAsset?.balance || '0';
      }

      // Calculate fiat value
      let balanceFiat = '';
      let rawFiatNumber: number | undefined;

      if (isSolana) {
        // Solana token - use multichain assets rates controller
        const conversionRates =
          MultichainAssetsRatesController?.state?.conversionRates;
        const assetConversionRate =
          conversionRates?.[
            `${token.caipChainId}/token:${token.address}` as `${string}:${string}/${string}:${string}`
          ];

        if (assetConversionRate) {
          // Normalize balance for fiat calculation (replace comma with period)
          const normalizedBalanceForFiat = balanceToUse.replace(',', '.');
          const balanceFiatCalculation = Number(
            balanceToFiatNumber(
              normalizedBalanceForFiat,
              Number(assetConversionRate.rate),
              1,
            ),
          );
          balanceFiat = addCurrencySymbol(balanceFiatCalculation, 'usd');
          rawFiatNumber = balanceFiatCalculation;
        } else {
          // No conversion rate available - show balance with symbol
          balanceFiat = `${balanceToUse} ${token.symbol}`;
        }
      } else {
        // EVM token - use exchange rates and market data
        const chainId = assetChainId as Hex;
        const ratesKey = `${chainId}-${token.address?.toLowerCase()}`;
        const rates = exchangeRatesMap.get(ratesKey);

        if (rates?.conversionRate && rates?.marketData) {
          // Create a mock asset to use deriveBalanceFromAssetMarketDetails
          // Normalize balance for calculations (replace comma with period)
          const normalizedBalanceForEvm = balanceToUse.replace(',', '.');
          const mockAsset: TokenI = {
            address: token.address ?? '',
            symbol: token.symbol ?? '',
            decimals: token.decimals ?? 0,
            balance: normalizedBalanceForEvm,
            chainId,
            image: '',
            logo: '',
            name: token.name ?? '',
            isETH: false,
            aggregators: [],
          };

          const derivedBalance = deriveBalanceFromAssetMarketDetails(
            mockAsset,
            {
              [token.address?.toLowerCase() as Hex]: rates.marketData,
            },
            {},
            rates.conversionRate,
            currentCurrency || '',
          );

          balanceFiat = derivedBalance.balanceFiat || '';
          rawFiatNumber = derivedBalance.balanceFiatCalculation;
        } else if (filteredToken?.balanceFiat) {
          // Fallback to pre-calculated balance from tokensWithBalance
          balanceFiat = filteredToken.balanceFiat;
          rawFiatNumber = parseFloat(
            filteredToken.balanceFiat.replace(/[^0-9.-]/g, ''),
          );
        } else {
          // No rates available - show simple USD format
          const normalizedBalanceForFallback = balanceToUse.replace(',', '.');
          balanceFiat = `$${parseFloat(normalizedBalanceForFallback || '0').toFixed(2)}`;
        }
      }

      // Normalize balance string: replace comma with period for proper parsing
      // Some locales use comma as decimal separator (e.g., "4,95551" instead of "4.95551")
      const normalizedBalance = (balanceToUse || '0').replace(',', '.');
      const rawTokenBalance = parseFloat(normalizedBalance);
      const balanceFormatted = `${parseFloat(normalizedBalance).toFixed(6)} ${token.symbol}`;

      map.set(tokenKey, {
        balanceFiat,
        balanceFormatted,
        rawFiatNumber,
        rawTokenBalance,
      });
    });

    return map;
  }, [
    tokens,
    tokensWithBalance,
    MultichainAssetsRatesController?.state?.conversionRates,
    exchangeRatesMap,
    currentCurrency,
    walletAssetsMap,
  ]);

  return balancesMap;
};
