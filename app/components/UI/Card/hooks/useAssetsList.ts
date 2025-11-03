import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { Hex } from '@metamask/utils';
import { selectShowFiatInTestnets } from '../../../../selectors/settings';
import { TOKEN_RATE_UNDEFINED } from '../../Tokens/constants';
import { strings } from '../../../../../locales/i18n';
import { isTestNet } from '../../../../util/networks';
import { AllowanceState, CardTokenAllowance } from '../types';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { selectAsset } from '../../../../selectors/assets/assets-list';
import {
  selectCurrencyRateForChainId,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { deriveBalanceFromAssetMarketDetails } from '../../Tokens/util';
import { selectSingleTokenPriceMarketData } from '../../../../selectors/tokenRatesController';
import { SOLANA_MAINNET } from '../../Ramp/Deposit/constants/networks';
import Engine from '../../../../core/Engine';
import {
  addCurrencySymbol,
  balanceToFiatNumber,
} from '../../../../util/number';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { TokenI } from '../../Tokens/types';
import { safeFormatChainIdToHex } from '../util/safeFormatChainIdToHex';

/**
 * Interface for tokens formatted for AssetSelectionBottomSheet
 */
export interface SupportedTokenWithChain {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  enabled: boolean;
  chainId: string;
  chainName: string;
  balance?: string;
  balanceFiat?: string;
  image?: string;
  logo?: string;
  allowanceState: AllowanceState;
  allowance?: string;
}

/**
 * Hook to format CardTokenAllowance list for AssetSelectionBottomSheet
 *
 * This hook takes a list of tokens (from useLoadCardData) and enriches them
 * with balance information and formats them for the AssetSelectionBottomSheet component.
 *
 * @param tokens - Array of CardTokenAllowance objects
 * @returns Array of SupportedTokenWithChain objects ready for presentation
 */
export const useAssetsList = (
  tokens: CardTokenAllowance[],
): SupportedTokenWithChain[] => {
  const { MultichainAssetsRatesController } = Engine.context;
  const chainIds = [LINEA_CHAIN_ID, SOLANA_MAINNET.chainId];

  const tokensWithBalance = useTokensWithBalance({
    chainIds,
  });

  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);
  const currentCurrency = useSelector(selectCurrentCurrency);

  // Get all assets and rates data from Redux (outside of the map loop)
  const allAssets = useSelector((state: RootState) => state);

  const formattedTokens = useMemo(() => {
    if (!tokens || tokens.length === 0) {
      return [];
    }

    return tokens.map((token): SupportedTokenWithChain => {
      const chainId = safeFormatChainIdToHex(
        token.caipChainId,
      ) as `0x${string}`;

      // Get asset from assets list or build from token data
      let asset = selectAsset(allAssets, {
        address: token.address ?? '',
        chainId,
      });

      if (!asset && token) {
        const assetAddress =
          token.caipChainId && isSolanaChainId(token.caipChainId)
            ? `${token.caipChainId}/token:${token.address}`
            : (token.address?.toLowerCase() ?? '');
        const iconUrl = buildTokenIconUrl(
          token.caipChainId,
          token.address ?? '',
        );
        const filteredToken = tokensWithBalance.find(
          (t) => t.address === assetAddress && t.chainId === token.caipChainId,
        );

        asset = {
          ...token,
          image: iconUrl,
          logo: iconUrl,
          isETH: false,
          aggregators: [],
          balance: filteredToken?.balance ?? '0',
          balanceFiat: filteredToken?.balanceFiat ?? '0',
        } as TokenI;
      }

      // Get conversion rate and exchange rates for the chain
      const conversionRate = selectCurrencyRateForChainId(allAssets, chainId);
      const exchangeRates = selectSingleTokenPriceMarketData(
        allAssets,
        chainId,
        token.address as Hex,
      );

      // Calculate balance and fiat value
      let balance = asset?.balance ?? '0';
      let balanceFiat: string | undefined;

      if (token.availableBalance) {
        balance = token.availableBalance;

        if (isSolanaChainId(chainId)) {
          const conversionRates =
            MultichainAssetsRatesController?.state?.conversionRates;
          const assetConversionRate =
            conversionRates?.[
              `${chainId}/token:${asset?.address}` as `${string}:${string}/${string}:${string}`
            ];

          if (assetConversionRate) {
            const balanceFiatCalculation = Number(
              balanceToFiatNumber(
                token.availableBalance,
                Number(assetConversionRate.rate),
                1,
              ),
            );
            balanceFiat = addCurrencySymbol(balanceFiatCalculation, 'usd');
          } else {
            balanceFiat = `${token.availableBalance} ${token.symbol}`;
          }
        } else {
          const derivedBalance = deriveBalanceFromAssetMarketDetails(
            asset || ({} as TokenI),
            exchangeRates || {},
            {},
            conversionRate || 0,
            currentCurrency || '',
          );
          balanceFiat = derivedBalance.balanceFiat;
        }
      } else {
        balanceFiat = asset?.balanceFiat;
      }

      // Handle test nets
      const shouldNotShowBalanceOnTestnets =
        isTestNet(chainId) && !showFiatOnTestnets;

      if (shouldNotShowBalanceOnTestnets && !balanceFiat) {
        balanceFiat = undefined;
      }

      if (balanceFiat === TOKEN_RATE_UNDEFINED) {
        balanceFiat = strings('wallet.unable_to_find_conversion_rate');
      }

      // Determine chain name
      const chainName = isSolanaChainId(chainId) ? 'Solana' : 'Linea';

      // Build icon URL
      const iconUrl = buildTokenIconUrl(token.caipChainId, token.address ?? '');

      return {
        address: token.address ?? '',
        symbol: token.symbol || '',
        name: token.name || token.symbol || '',
        decimals: token.decimals || 0,
        enabled: token.allowanceState !== AllowanceState.NotEnabled,
        chainId: token.caipChainId || chainId,
        chainName,
        balance,
        balanceFiat,
        image: iconUrl,
        logo: iconUrl,
        allowanceState: token.allowanceState,
        allowance: token.allowance,
      };
    });
  }, [
    tokens,
    tokensWithBalance,
    allAssets,
    showFiatOnTestnets,
    currentCurrency,
    MultichainAssetsRatesController?.state?.conversionRates,
  ]);

  return formattedTokens;
};
