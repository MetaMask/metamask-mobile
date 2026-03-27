import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { useMemo, useCallback } from 'react';
import { Hex } from '@metamask/utils';
import { AllowanceState, CardTokenAllowance } from '../types';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { SOLANA_MAINNET } from '../../Ramp/Deposit/constants/networks';
import Engine from '../../../../core/Engine';
import { balanceToFiatNumber } from '../../../../util/number';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { safeFormatChainIdToHex } from '../util/safeFormatChainIdToHex';
import { TokenI } from '../../Tokens/types';
import { MarketDataDetails } from '@metamask/assets-controllers';
import { formatWithThreshold } from '../../../../util/assets';
import I18n from '../../../../../locales/i18n';
import { deriveBalanceFromAssetMarketDetails } from '../../Tokens/util';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';

const extractTrailingCurrencyCode = (value: string): string | undefined => {
  const match = value.trim().match(/([A-Za-z]{3})$/);
  return match ? match[1].toUpperCase() : undefined;
};

/**
 * Parses a locale-formatted currency string to a number.
 * Handles both formats:
 * - US/UK: "1,234.56" (comma as thousands separator, dot as decimal)
 * - EU/BR: "1.234,56" or "0,55" (dot as thousands separator, comma as decimal)
 */
const parseLocaleFiatString = (value: string): number => {
  // Remove everything except digits, dots, and commas
  const cleaned = value.replace(/[^0-9.,-]/g, '');

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    // Both separators present - the last one is the decimal separator
    const lastCommaIndex = cleaned.lastIndexOf(',');
    const lastDotIndex = cleaned.lastIndexOf('.');

    if (lastDotIndex > lastCommaIndex) {
      // Format: 1,234.56 - comma is thousands, dot is decimal
      return parseFloat(cleaned.replace(/,/g, ''));
    }
    // Format: 1.234,56 - dot is thousands, comma is decimal
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }

  if (hasComma && !hasDot) {
    // Only comma - check if it's decimal separator (followed by 1-2 digits at end)
    const commaMatch = cleaned.match(/,(\d{1,2})$/);
    if (commaMatch) {
      // Format: 0,55 or 1234,56 - comma is decimal separator
      return parseFloat(cleaned.replace(',', '.'));
    }
    // Format: 1,234 - comma is thousands separator
    return parseFloat(cleaned.replace(/,/g, ''));
  }

  // Only dot or no separators - standard parsing
  return parseFloat(cleaned);
};

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
  const chainIds = [
    CHAIN_IDS.LINEA_MAINNET,
    SOLANA_MAINNET.chainId,
    CHAIN_IDS.BASE,
  ];

  const tokensWithBalance = useTokensWithBalance({
    chainIds,
  });

  // Get raw state needed for asset lookups - these are stable references from Redux
  const allAssets = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.TokensController.allTokens,
  );
  const allDetectedTokens = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.TokensController.allDetectedTokens,
  );
  const networkConfigs = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
  );
  const currencyRates = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.CurrencyRateController.currencyRates,
  );

  // Build the walletAssetsMap in useMemo using raw state
  const walletAssetsMap = useMemo(() => {
    const map = new Map<string, TokenI>();
    tokens
      .filter((token) => token !== undefined)
      .forEach((token) => {
        if (token?.caipChainId && token?.address) {
          const isSolana = isSolanaChainId(token.caipChainId);
          const chainId = isSolana
            ? token.caipChainId
            : (safeFormatChainIdToHex(token.caipChainId) as string);

          // Manually lookup asset from raw state (similar to selectAsset)
          const allTokensForChain = allAssets?.[chainId as Hex];
          const detectedTokensForChain = allDetectedTokens?.[chainId as Hex];

          let asset: TokenI | undefined;
          if (allTokensForChain) {
            for (const accountTokens of Object.values(allTokensForChain)) {
              const found = (accountTokens as TokenI[])?.find(
                (t) =>
                  t.address?.toLowerCase() === token.address?.toLowerCase(),
              );
              if (found) {
                asset = found;
                break;
              }
            }
          }
          if (!asset && detectedTokensForChain) {
            for (const accountTokens of Object.values(detectedTokensForChain)) {
              const found = (accountTokens as TokenI[])?.find(
                (t) =>
                  t.address?.toLowerCase() === token.address?.toLowerCase(),
              );
              if (found) {
                asset = found;
                break;
              }
            }
          }

          if (asset) {
            const key = `${token.address.toLowerCase()}-${token.caipChainId}`;
            map.set(key, asset);
          }
        }
      });
    return map;
  }, [tokens, allAssets, allDetectedTokens]);

  // Build the exchangeRatesMap in useMemo using raw state
  const exchangeRatesMap = useMemo(() => {
    const map = new Map<
      string,
      { conversionRate: number; marketData: MarketDataDetails | undefined }
    >();

    tokens.forEach((token) => {
      if (token?.caipChainId && !isSolanaChainId(token.caipChainId)) {
        const chainId = safeFormatChainIdToHex(token.caipChainId) as Hex;

        // Get network configuration to find the native currency symbol
        const networkConfig = networkConfigs?.[chainId];
        const nativeCurrency = networkConfig?.nativeCurrency;

        // Use native currency symbol (e.g., "ETH") to look up conversion rate
        const currencyRateEntry = nativeCurrency
          ? currencyRates?.[nativeCurrency]
          : undefined;

        const conversionRate = currencyRateEntry?.conversionRate;

        const marketData =
          TokenRatesController?.state?.marketData?.[chainId]?.[
            token.address?.toLowerCase() as Hex
          ];

        // Only require conversionRate to be present (marketData is optional)
        if (conversionRate !== undefined && conversionRate !== null) {
          map.set(`${chainId}-${token.address?.toLowerCase()}`, {
            conversionRate,
            marketData,
          });
        }
      }
    });

    return map;
  }, [
    tokens,
    networkConfigs,
    currencyRates,
    TokenRatesController?.state?.marketData,
  ]);

  const currentCurrency = useSelector(selectCurrentCurrency);

  // Helper: Determine which balance to use based on token state
  const determineBalanceToUse = useCallback(
    (
      token: CardTokenAllowance,
      filteredToken: TokenI | undefined,
      walletAsset: TokenI | undefined,
    ): {
      balance: string;
      source: 'availableBalance' | 'filteredToken' | 'walletAsset';
    } => {
      const isEnabled =
        token.allowanceState === AllowanceState.Enabled ||
        token.allowanceState === AllowanceState.Limited;

      if (isEnabled) {
        // Token is enabled/delegated - use availableBalance
        if (token.availableBalance) {
          return {
            balance: token.availableBalance,
            source: 'availableBalance',
          };
        }
        if (filteredToken?.balance) {
          return { balance: filteredToken.balance, source: 'filteredToken' };
        }
        if (walletAsset?.balance) {
          return { balance: walletAsset.balance, source: 'walletAsset' };
        }
        return { balance: '0', source: 'availableBalance' };
      }

      // Token is not enabled - use actual wallet balance
      if (filteredToken?.balance) {
        return { balance: filteredToken.balance, source: 'filteredToken' };
      }
      if (walletAsset?.balance) {
        return { balance: walletAsset.balance, source: 'walletAsset' };
      }
      return { balance: '0', source: 'availableBalance' };
    },
    [],
  );

  // Helper: Calculate fiat for Solana tokens
  const calculateSolanaFiat = useCallback(
    (
      token: CardTokenAllowance,
      balanceToUse: string,
    ): { balanceFiat: string; rawFiatNumber: number | undefined } => {
      const conversionRates =
        MultichainAssetsRatesController?.state?.conversionRates;
      const assetKey =
        `${token.caipChainId}/token:${token.address}` as `${string}:${string}/${string}:${string}`;
      const assetConversionRate = conversionRates?.[assetKey];

      if (assetConversionRate) {
        const normalizedBalanceForFiat = balanceToUse.replace(',', '.');
        const balanceFiatCalculation = Number(
          balanceToFiatNumber(
            normalizedBalanceForFiat,
            Number(assetConversionRate.rate),
            1,
          ),
        );

        const balanceFiat = formatWithThreshold(
          balanceFiatCalculation,
          0.01,
          I18n.locale,
          {
            style: 'currency',
            currency: currentCurrency?.toUpperCase() || 'USD',
          },
        );

        return { balanceFiat, rawFiatNumber: balanceFiatCalculation };
      }

      // Fallback: Check if balance is actually zero
      const balanceNum = parseFloat(balanceToUse.replace(',', '.'));
      if (balanceNum === 0 || isNaN(balanceNum)) {
        // Show $0.00 for zero balances
        const balanceFiat = formatWithThreshold(0, 0.01, I18n.locale, {
          style: 'currency',
          currency: currentCurrency?.toUpperCase() || 'USD',
        });

        return {
          balanceFiat,
          rawFiatNumber: 0,
        };
      }

      // If we have a real balance but no conversion rate, show balance with symbol
      // This prevents showing $0.00 for tokens with actual value
      return {
        balanceFiat: `${parseFloat(balanceToUse.replace(',', '.')).toFixed(6)} ${token.symbol}`,
        rawFiatNumber: undefined,
      };
    },
    [MultichainAssetsRatesController?.state?.conversionRates, currentCurrency],
  );

  // Helper: Calculate fiat with market data
  const calculateFiatFromMarketData = useCallback(
    (
      balanceToUse: string,
      conversionRate: number,
      tokenPrice: number,
    ): { balanceFiat: string; rawFiatNumber: number } => {
      const normalizedBalance = balanceToUse.replace(',', '.');
      const balanceFiatCalculation = Number(
        balanceToFiatNumber(normalizedBalance, conversionRate, tokenPrice),
      );

      const balanceFiat = formatWithThreshold(
        balanceFiatCalculation,
        0.01,
        I18n.locale,
        {
          style: 'currency',
          currency: currentCurrency?.toUpperCase() || 'USD',
        },
      );

      return { balanceFiat, rawFiatNumber: balanceFiatCalculation };
    },
    [currentCurrency],
  );

  // Helper: Calculate proportional fiat
  const calculateProportionalFiat = useCallback(
    (
      balanceToUse: string,
      walletAsset: TokenI,
    ): { balanceFiat: string; rawFiatNumber: number | undefined } => {
      const walletBalanceNum = parseFloat(
        (walletAsset.balance || '0').replace(/[^0-9.]/g, ''),
      );
      const balanceToUseNum = parseFloat(balanceToUse.replace(',', '.'));
      const walletBalanceFiatNum = parseFloat(
        (walletAsset.balanceFiat || '0').replace(/[^0-9.-]/g, ''),
      );

      if (walletBalanceNum > 0 && balanceToUseNum > 0) {
        const proportionalFiat =
          (balanceToUseNum / walletBalanceNum) * walletBalanceFiatNum;

        const balanceFiat = formatWithThreshold(
          proportionalFiat,
          0.01,
          I18n.locale,
          {
            style: 'currency',
            currency: currentCurrency?.toUpperCase() || 'USD',
          },
        );

        return { balanceFiat, rawFiatNumber: proportionalFiat };
      }

      return { balanceFiat: '', rawFiatNumber: undefined };
    },
    [currentCurrency],
  );

  // Helper: Calculate fiat for EVM tokens
  const calculateEvmFiat = useCallback(
    (
      _token: CardTokenAllowance,
      balanceToUse: string,
      balanceSource: 'availableBalance' | 'filteredToken' | 'walletAsset',
      chainId: Hex,
      rates:
        | { conversionRate: number; marketData: MarketDataDetails | undefined }
        | undefined,
      filteredToken: TokenI | undefined,
      walletAsset: TokenI | undefined,
    ): { balanceFiat: string; rawFiatNumber: number | undefined } => {
      // Primary: Calculate fiat value from market data
      if (
        rates?.conversionRate &&
        rates.conversionRate > 0 &&
        rates.marketData?.price
      ) {
        return calculateFiatFromMarketData(
          balanceToUse,
          rates.conversionRate,
          rates.marketData.price,
        );
      }

      // Use pre-calculated fiat from filtered token
      if (balanceSource === 'filteredToken' && filteredToken?.balanceFiat) {
        // Handle special strings like "tokenRateUndefined" or "tokenBalanceLoading"
        if (
          filteredToken.balanceFiat === 'tokenRateUndefined' ||
          filteredToken.balanceFiat === 'tokenBalanceLoading'
        ) {
          // Check if balance is zero
          const balanceNum = parseFloat(balanceToUse.replace(',', '.'));
          if (balanceNum === 0 || isNaN(balanceNum)) {
            const balanceFiat = formatWithThreshold(0, 0.01, I18n.locale, {
              style: 'currency',
              currency: currentCurrency?.toUpperCase() || 'USD',
            });
            return { balanceFiat, rawFiatNumber: 0 };
          }

          // Non-zero balance but no rate - show token balance
          return {
            balanceFiat: `${parseFloat(balanceToUse.replace(',', '.')).toFixed(6)} ${_token.symbol}`,
            rawFiatNumber: undefined,
          };
        }

        // Parse the numeric value and reformat it properly
        // Handle locale-formatted numbers (e.g., "US$ 0,55" or "$1,234.56")
        const rawFiatNumber = parseLocaleFiatString(filteredToken.balanceFiat);

        if (!isNaN(rawFiatNumber)) {
          const originalCurrencyCode = extractTrailingCurrencyCode(
            filteredToken.balanceFiat,
          );

          // Use the detected currency code if available, otherwise use current currency
          const currencyToUse =
            originalCurrencyCode || currentCurrency?.toUpperCase() || 'USD';

          const balanceFiat = formatWithThreshold(
            rawFiatNumber,
            0.01,
            I18n.locale,
            {
              style: 'currency',
              currency: currencyToUse,
            },
          );

          return { balanceFiat, rawFiatNumber };
        }
      }

      // Use pre-calculated fiat from wallet asset
      if (balanceSource === 'walletAsset' && walletAsset?.balanceFiat) {
        // Handle special strings like "tokenRateUndefined" or "tokenBalanceLoading"
        if (
          walletAsset.balanceFiat === 'tokenRateUndefined' ||
          walletAsset.balanceFiat === 'tokenBalanceLoading'
        ) {
          // Check if balance is zero
          const balanceNum = parseFloat(balanceToUse.replace(',', '.'));
          if (balanceNum === 0 || isNaN(balanceNum)) {
            const balanceFiat = formatWithThreshold(0, 0.01, I18n.locale, {
              style: 'currency',
              currency: currentCurrency?.toUpperCase() || 'USD',
            });
            return { balanceFiat, rawFiatNumber: 0 };
          }

          // Non-zero balance but no rate - show token balance
          return {
            balanceFiat: `${parseFloat(balanceToUse.replace(',', '.')).toFixed(6)} ${_token.symbol}`,
            rawFiatNumber: undefined,
          };
        }

        // Parse the numeric value and reformat it properly
        // Handle locale-formatted numbers (e.g., "US$ 0,55" or "$1,234.56")
        const rawFiatNumber = parseLocaleFiatString(walletAsset.balanceFiat);

        if (!isNaN(rawFiatNumber)) {
          const originalCurrencyCode = extractTrailingCurrencyCode(
            walletAsset.balanceFiat,
          );

          // Use the detected currency code if available, otherwise use current currency
          const currencyToUse =
            originalCurrencyCode || currentCurrency?.toUpperCase() || 'USD';

          const balanceFiat = formatWithThreshold(
            rawFiatNumber,
            0.01,
            I18n.locale,
            {
              style: 'currency',
              currency: currencyToUse,
            },
          );

          return { balanceFiat, rawFiatNumber };
        }
      }

      // For availableBalance with rates but no market data price
      // Try deriveBalanceFromAssetMarketDetails even without walletAsset
      if (
        balanceSource === 'availableBalance' &&
        rates?.conversionRate &&
        rates.conversionRate > 0
      ) {
        const normalizedBalance = balanceToUse.replace(',', '.');

        // Create mock asset from walletAsset if available, otherwise from token data
        const mockAsset: TokenI = walletAsset
          ? {
              ...walletAsset,
              balance: normalizedBalance,
              balanceFiat: undefined,
            }
          : ({
              address: _token.address ?? '',
              symbol: _token.symbol ?? '',
              decimals: _token.decimals ?? 0,
              name: _token.name ?? _token.symbol ?? '',
              balance: normalizedBalance,
              balanceFiat: undefined,
              chainId,
              isETH: false,
              aggregators: [],
              image: buildTokenIconUrl(
                _token.caipChainId,
                _token.address ?? '',
              ),
              logo: buildTokenIconUrl(_token.caipChainId, _token.address ?? ''),
            } as TokenI);

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
          const balanceFiat = formatWithThreshold(
            derivedBalance.balanceFiatCalculation,
            0.01,
            I18n.locale,
            {
              style: 'currency',
              currency: currentCurrency?.toUpperCase() || 'USD',
            },
          );

          return {
            balanceFiat,
            rawFiatNumber: derivedBalance.balanceFiatCalculation,
          };
        }
      }

      // Fallback: Proportional calculation
      if (
        balanceSource === 'availableBalance' &&
        walletAsset?.balanceFiat &&
        walletAsset?.balance
      ) {
        const result = calculateProportionalFiat(balanceToUse, walletAsset);
        if (result.balanceFiat) {
          return result;
        }
      }

      // Last resort: Check if balance is actually zero
      const balanceNum = parseFloat(balanceToUse.replace(',', '.'));
      if (balanceNum === 0 || isNaN(balanceNum)) {
        // Show $0.00 for zero balances
        const balanceFiat = formatWithThreshold(0, 0.01, I18n.locale, {
          style: 'currency',
          currency: currentCurrency?.toUpperCase() || 'USD',
        });

        return {
          balanceFiat,
          rawFiatNumber: 0,
        };
      }

      // If we have a real balance but no price data, show balance with symbol
      // This prevents showing $0.00 for tokens with actual value
      return {
        balanceFiat: `${parseFloat(balanceToUse.replace(',', '.')).toFixed(6)} ${_token.symbol}`,
        rawFiatNumber: undefined,
      };
    },
    [
      calculateFiatFromMarketData,
      calculateProportionalFiat,
      TokenRatesController?.state?.marketData,
      currentCurrency,
    ],
  );

  // Helper: Build asset object
  const buildAssetObject = useCallback(
    (
      token: CardTokenAllowance,
      balanceToUse: string,
      balanceFiat: string,
      assetChainId: string,
    ): TokenI | undefined => {
      if (!token) return undefined;

      const iconUrl = token.caipChainId
        ? buildTokenIconUrl(token.caipChainId, token.address ?? '')
        : undefined;

      return {
        ...token,
        image: iconUrl,
        logo: iconUrl,
        isETH: false,
        aggregators: [],
        balance: balanceToUse,
        balanceFiat,
        chainId: assetChainId,
      } as TokenI;
    },
    [],
  );

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

      // Get asset address and chain ID
      const assetAddress = isSolana
        ? `${token.caipChainId}/token:${token.address}`
        : token.address?.toLowerCase();
      const assetChainId = isSolana
        ? token.caipChainId
        : safeFormatChainIdToHex(token.caipChainId);

      // Find the token in tokensWithBalance
      // Note: tokensWithBalance uses hex chainId (e.g., "0xe708") while token has CAIP chainId (e.g., "eip155:59144")
      // We need to use assetChainId which is already normalized to the correct format
      // Also need case-insensitive address comparison since tokensWithBalance may have checksum addresses
      const filteredToken = tokensWithBalance.find(
        (t) =>
          t.address?.toLowerCase() === assetAddress?.toLowerCase() &&
          t.chainId === assetChainId,
      );

      // Get wallet asset as fallback
      const walletAssetKey = `${token.address?.toLowerCase()}-${token.caipChainId}`;
      const walletAsset = walletAssetsMap.get(walletAssetKey);

      // Determine which balance to use
      const { balance: balanceToUse, source: balanceSource } =
        determineBalanceToUse(
          token,
          filteredToken as TokenI | undefined,
          walletAsset,
        );

      // Calculate fiat value
      let balanceFiat = '';
      let rawFiatNumber: number | undefined;

      if (isSolana) {
        const result = calculateSolanaFiat(token, balanceToUse);
        balanceFiat = result.balanceFiat;
        rawFiatNumber = result.rawFiatNumber;
      } else {
        const chainId = assetChainId as Hex;
        const ratesKey = `${chainId}-${token.address?.toLowerCase()}`;
        const rates = exchangeRatesMap.get(ratesKey);

        const result = calculateEvmFiat(
          token,
          balanceToUse,
          balanceSource,
          chainId,
          rates,
          filteredToken as TokenI | undefined,
          walletAsset,
        );
        balanceFiat = result.balanceFiat;
        rawFiatNumber = result.rawFiatNumber;
      }

      // Normalize and format balance
      const normalizedBalance = (balanceToUse || '0').replace(',', '.');
      const rawTokenBalance = parseFloat(normalizedBalance);
      const balanceFormatted = `${parseFloat(normalizedBalance).toFixed(6)} ${token.symbol}`;

      // Build asset object
      const asset = buildAssetObject(
        token,
        balanceToUse,
        balanceFiat,
        assetChainId,
      );

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
    exchangeRatesMap,
    walletAssetsMap,
    determineBalanceToUse,
    calculateSolanaFiat,
    calculateEvmFiat,
    buildAssetObject,
  ]);

  return balancesMap;
};
