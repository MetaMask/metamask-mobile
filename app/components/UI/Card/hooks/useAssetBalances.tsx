import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { AllowanceState, CardTokenAllowance } from '../types';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { SOLANA_MAINNET } from '../../Ramp/Deposit/constants/networks';
import Engine from '../../../../core/Engine';
import { balanceToFiatNumber } from '../../../../util/number';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { safeFormatChainIdToHex } from '../util/safeFormatChainIdToHex';
import { TokenI } from '../../Tokens/types';
import { MarketDataDetails } from '@metamask/assets-controllers';
import { selectAsset } from '../../../../selectors/assets/assets-list';
import { formatWithThreshold } from '../../../../util/assets';
import I18n from '../../../../../locales/i18n';
import { deriveBalanceFromAssetMarketDetails } from '../../Tokens/util';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';

export interface AssetBalanceInfo {
  asset: TokenI | undefined;
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
  tokens: CardTokenAllowance[],
): Map<string, AssetBalanceInfo> => {
  const { MultichainAssetsRatesController, TokenRatesController } =
    Engine.context;
  const chainIds = [LINEA_CHAIN_ID, SOLANA_MAINNET.chainId];

  const tokensWithBalance = useTokensWithBalance({
    chainIds,
  });

  // Get all assets from wallet for fallback balance lookup
  const walletAssetsMap = useSelector((state: RootState) => {
    const map = new Map<string, TokenI>();
    tokens
      .filter((token) => token !== undefined)
      .forEach((token) => {
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

        // Get network configuration to find the native currency symbol
        const networkConfig =
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId[chainId];
        const nativeCurrency = networkConfig?.nativeCurrency;

        // Use native currency symbol (e.g., "ETH") to look up conversion rate
        // The conversionRate property already converts to the user's selected currency
        const currencyRateEntry = nativeCurrency
          ? state.engine.backgroundState.CurrencyRateController.currencyRates[
              nativeCurrency
            ]
          : undefined;

        const conversionRate = currencyRateEntry?.conversionRate;

        const marketData =
          TokenRatesController?.state?.marketData?.[chainId]?.[
            token.address?.toLowerCase() as Hex
          ];

        if (conversionRate !== undefined && conversionRate !== null) {
          map.set(`${chainId}-${token.address?.toLowerCase()}`, {
            conversionRate,
            marketData,
          });
        }
      }
    });
    return map;
  });

  const currentCurrency = useSelector(selectCurrentCurrency);

  // Create a map of asset balances
  const balancesMap = useMemo<Map<string, AssetBalanceInfo>>(() => {
    const map = new Map<string, AssetBalanceInfo>();

    tokens.forEach((token) => {
      if (!token?.caipChainId) {
        return;
      }

      // Create a unique key for this token
      // Include walletAddress to distinguish same token on same chain but different wallets
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
      let balanceSource: 'availableBalance' | 'filteredToken' | 'walletAsset' =
        'availableBalance';

      if (
        token.allowanceState === AllowanceState.Enabled ||
        token.allowanceState === AllowanceState.Limited
      ) {
        // Token is enabled/delegated - use availableBalance
        // availableBalance is the minimum of remaining allowance and wallet balance
        // This is the correct spendable amount for card transactions
        if (token.availableBalance) {
          balanceToUse = token.availableBalance;
          balanceSource = 'availableBalance';
        } else if (filteredToken?.balance) {
          balanceToUse = filteredToken.balance;
          balanceSource = 'filteredToken';
        } else if (walletAsset?.balance) {
          balanceToUse = walletAsset.balance;
          balanceSource = 'walletAsset';
        } else {
          balanceToUse = '0';
        }
      } else if (filteredToken?.balance) {
        // Token is not enabled - use actual wallet balance from tokensWithBalance
        // For non-enabled tokens, availableBalance is 0 even if user has balance
        // (because availableBalance = min(balance, allowance) and allowance is 0)
        balanceToUse = filteredToken.balance;
        balanceSource = 'filteredToken';
      } else if (walletAsset?.balance) {
        balanceToUse = walletAsset.balance;
        balanceSource = 'walletAsset';
      } else {
        balanceToUse = '0';
      }

      // Calculate fiat value
      let balanceFiat = '';
      let rawFiatNumber: number | undefined;

      if (isSolana) {
        // Solana token - use multichain assets rates controller
        // The conversion rate from MultichainAssetsRatesController is already in the user's selected currency
        const conversionRates =
          MultichainAssetsRatesController?.state?.conversionRates;
        const assetConversionRate =
          conversionRates?.[
            `${token.caipChainId}/token:${token.address}` as `${string}:${string}/${string}:${string}`
          ];

        if (assetConversionRate) {
          // Normalize balance for fiat calculation (replace comma with period)
          const normalizedBalanceForFiat = balanceToUse.replace(',', '.');
          // balanceToFiatNumber: balance × rate × exchangeRate
          // For Solana, rate is already in user's currency, so exchangeRate = 1
          const balanceFiatCalculation = Number(
            balanceToFiatNumber(
              normalizedBalanceForFiat,
              Number(assetConversionRate.rate),
              1,
            ),
          );
          // Use formatWithThreshold for proper currency formatting (supports BRL and all currencies)
          balanceFiat = formatWithThreshold(
            balanceFiatCalculation,
            0.01,
            I18n.locale,
            {
              style: 'currency',
              currency: currentCurrency?.toUpperCase() || 'USD',
            },
          );
          rawFiatNumber = balanceFiatCalculation;
        } else {
          // No conversion rate available - show balance with symbol
          balanceFiat = `${balanceToUse} ${token.symbol}`;
        }
      } else {
        // EVM token - calculate from market data or use pre-calculated balance
        const chainId = assetChainId as Hex;
        const ratesKey = `${chainId}-${token.address?.toLowerCase()}`;
        const rates = exchangeRatesMap.get(ratesKey);

        if (
          rates?.conversionRate &&
          rates.conversionRate > 0 &&
          rates.marketData?.price
        ) {
          // Primary: Calculate fiat value from market data
          // This is always the most accurate for the actual balance we're showing
          const normalizedBalanceForEvm = balanceToUse.replace(',', '.');
          const tokenPrice = rates.marketData.price;

          // Formula: tokenBalance × tokenPriceInNativeCurrency × nativeCurrencyToUserCurrencyRate
          const balanceFiatCalculation = Number(
            balanceToFiatNumber(
              normalizedBalanceForEvm,
              rates.conversionRate,
              tokenPrice,
            ),
          );

          // Use formatWithThreshold for proper currency formatting (supports BRL and all currencies)
          balanceFiat = formatWithThreshold(
            balanceFiatCalculation,
            0.01,
            I18n.locale,
            {
              style: 'currency',
              currency: currentCurrency?.toUpperCase() || 'USD',
            },
          );
          rawFiatNumber = balanceFiatCalculation;
        } else if (
          balanceSource === 'filteredToken' &&
          filteredToken?.balanceFiat
        ) {
          // Use filteredToken's fiat since that's where we got the balance
          balanceFiat = filteredToken.balanceFiat;
          rawFiatNumber = parseFloat(
            filteredToken.balanceFiat.replace(/[^0-9.-]/g, ''),
          );
        } else if (
          balanceSource === 'walletAsset' &&
          walletAsset?.balanceFiat
        ) {
          // Use walletAsset's fiat since that's where we got the balance
          balanceFiat = walletAsset.balanceFiat;
          rawFiatNumber = parseFloat(
            walletAsset.balanceFiat.replace(/[^0-9.-]/g, ''),
          );
        } else if (
          balanceSource === 'availableBalance' &&
          rates?.conversionRate &&
          rates.conversionRate > 0
        ) {
          const normalizedBalanceForCalc = balanceToUse.replace(',', '.');

          if (walletAsset) {
            // Create a mock asset with the availableBalance to calculate fiat
            const mockAsset: TokenI = {
              ...walletAsset,
              balance: normalizedBalanceForCalc,
              balanceFiat: undefined, // Force recalculation
            };

            // Use TokenRatesController's full market data for this chain
            const allMarketDataForChain =
              TokenRatesController?.state?.marketData?.[chainId] || {};

            const derivedBalance = deriveBalanceFromAssetMarketDetails(
              mockAsset,
              allMarketDataForChain,
              {},
              rates.conversionRate,
              currentCurrency?.toLowerCase() || 'usd',
            );

            if (
              derivedBalance.balanceFiat &&
              derivedBalance.balanceFiat !== 'tokenRateUndefined' &&
              derivedBalance.balanceFiat !== 'tokenBalanceLoading' &&
              derivedBalance.balanceFiatCalculation !== undefined
            ) {
              // Use formatWithThreshold to properly format with BRL symbol
              balanceFiat = formatWithThreshold(
                derivedBalance.balanceFiatCalculation,
                0.01,
                I18n.locale,
                {
                  style: 'currency',
                  currency: currentCurrency?.toUpperCase() || 'USD',
                },
              );
              rawFiatNumber = derivedBalance.balanceFiatCalculation;
            } else {
              balanceFiat = `${balanceToUse} ${token.symbol}`;
            }
          } else {
            balanceFiat = `${balanceToUse} ${token.symbol}`;
          }
        } else if (
          balanceSource === 'availableBalance' &&
          walletAsset?.balanceFiat &&
          walletAsset?.balance
        ) {
          // Fallback: For enabled tokens, calculate proportional fiat from wallet asset
          const walletBalanceNum = parseFloat(
            (walletAsset.balance || '0').replace(/[^0-9.]/g, ''),
          );
          const balanceToUseNum = parseFloat(balanceToUse.replace(',', '.'));
          const walletBalanceFiatNum = parseFloat(
            walletAsset.balanceFiat.replace(/[^0-9.-]/g, ''),
          );

          if (walletBalanceNum > 0 && balanceToUseNum > 0) {
            // Calculate proportional fiat value
            const proportionalFiat =
              (balanceToUseNum / walletBalanceNum) * walletBalanceFiatNum;

            balanceFiat = formatWithThreshold(
              proportionalFiat,
              0.01,
              I18n.locale,
              {
                style: 'currency',
                currency: currentCurrency?.toUpperCase() || 'USD',
              },
            );
            rawFiatNumber = proportionalFiat;
          } else {
            balanceFiat = `${balanceToUse} ${token.symbol}`;
          }
        } else {
          // Last resort: show balance with token symbol
          balanceFiat = `${balanceToUse} ${token.symbol}`;
        }
      }

      // Normalize balance string: replace comma with period for proper parsing
      // Some locales use comma as decimal separator (e.g., "4,95551" instead of "4.95551")
      const normalizedBalance = (balanceToUse || '0').replace(',', '.');
      const rawTokenBalance = parseFloat(normalizedBalance);
      const balanceFormatted = `${parseFloat(normalizedBalance).toFixed(6)} ${token.symbol}`;

      // Build asset object compatible with TokenI interface
      const iconUrl = token.caipChainId
        ? buildTokenIconUrl(token.caipChainId, token.address ?? '')
        : undefined;

      const asset: TokenI | undefined = token
        ? ({
            ...token,
            image: iconUrl,
            logo: iconUrl,
            isETH: false,
            aggregators: [],
            balance: balanceToUse,
            balanceFiat,
            chainId: assetChainId,
          } as TokenI)
        : undefined;

      map.set(tokenKey, {
        asset,
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
    TokenRatesController?.state?.marketData,
    exchangeRatesMap,
    currentCurrency,
    walletAssetsMap,
  ]);

  return balancesMap;
};
