import {
  isSupportedPooledStakingChain,
  selectLendingMarketsByChainIdAndOutputTokenAddress,
  selectLendingMarketsByChainIdAndTokenAddress,
} from '@metamask/earn-controller';
import { Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import BN4 from 'bnjs4';
import { createSelector } from 'reselect';
import { EARN_EXPERIENCES } from '../../../components/UI/Earn/constants/experiences';
import { getEstimatedAnnualRewards } from '../../../components/UI/Earn/utils/token';
import { TokenI } from '../../../components/UI/Tokens/types';
import { deriveBalanceFromAssetMarketDetails } from '../../../components/UI/Tokens/util/deriveBalanceFromAssetMarketDetails';
import { RootState } from '../../../reducers';
import {
  getDecimalChainId,
  isPortfolioViewEnabled,
} from '../../../util/networks';
import { hexToBN, renderFiat, weiToFiatNumber } from '../../../util/number';
import { selectSelectedInternalAccountByScope } from '../../multichainAccounts/accounts';
import { selectAccountsByChainId } from '../../accountTrackerController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../currencyRateController';
import { selectAccountTokensAcrossChains } from '../../multichain';
import { selectNetworkConfigurations } from '../../networkController';
import { selectTokensBalances } from '../../tokenBalancesController';
import { selectTokenMarketData } from '../../tokenRatesController';
import { pooledStakingSelectors } from '../pooledStaking';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../components/UI/Earn/selectors/featureFlags';
import { EarnTokenDetails } from '../../../components/UI/Earn/types/lending.types';
import { createDeepEqualSelector } from '../../util';
import { toFormattedAddress } from '../../../util/address';
import { EVM_SCOPE } from '../../../components/UI/Earn/constants/networks';

const selectEarnControllerState = (state: RootState) =>
  state.engine.backgroundState.EarnController;

const selectEarnTokenBaseData = createSelector(
  [
    selectEarnControllerState,
    selectPooledStakingEnabledFlag,
    selectStablecoinLendingEnabledFlag,
    pooledStakingSelectors.selectPooledStakingPerChain,
    pooledStakingSelectors.selectEligibility,
    selectTokensBalances,
    selectTokenMarketData,
    selectSelectedInternalAccountByScope,
    selectCurrentCurrency,
    selectNetworkConfigurations,
    selectAccountTokensAcrossChains,
    selectCurrencyRates,
    selectAccountsByChainId,
  ],
  (
    earnState,
    isPooledStakingEnabled,
    isStablecoinLendingEnabled,
    pooledStakingPerChain,
    isPooledStakingEligible,
    tokenBalances,
    marketData,
    selectedAccountByScope,
    currentCurrency,
    networkConfigs,
    accountTokensAcrossChains,
    currencyRates,
    accountsByChainId,
  ) => ({
    earnState,
    isPooledStakingEnabled,
    isStablecoinLendingEnabled,
    pooledStakingPerChain,
    isPooledStakingEligible,
    tokenBalances,
    marketData,
    selectedAddress: selectedAccountByScope(EVM_SCOPE)?.address,
    currentCurrency,
    networkConfigs,
    accountTokensAcrossChains,
    currencyRates,
    accountsByChainId,
  }),
);

const selectEarnTokens = createDeepEqualSelector(
  selectEarnTokenBaseData,
  (earnTokenBaseData) => {
    const {
      earnState,
      // isPooledStakingEnabled,
      isStablecoinLendingEnabled,
      pooledStakingPerChain,
      isPooledStakingEligible,
      accountTokensAcrossChains,
      tokenBalances,
      marketData,
      selectedAddress,
      currentCurrency,
      currencyRates,
      networkConfigs,
      accountsByChainId,
    } = earnTokenBaseData;
    // TODO: replace with selector for this in controller
    const isStablecoinLendingEligible = isPooledStakingEligible;

    const emptyEarnTokensData: {
      earnTokens: EarnTokenDetails[];
      earnTokensByChainIdAndAddress: Record<
        string,
        Record<string, EarnTokenDetails>
      >;
      earnOutputTokens: EarnTokenDetails[];
      earnOutputTokensByChainIdAndAddress: Record<
        string,
        Record<string, EarnTokenDetails>
      >;
      earnTokenPairsByChainIdAndAddress: Record<
        string,
        Record<string, EarnTokenDetails[]>
      >;
      earnOutputTokenPairsByChainIdAndAddress: Record<
        string,
        Record<string, EarnTokenDetails[]>
      >;
      earnableTotalFiatNumber: number;
      earnableTotalFiatFormatted: string;
    } = {
      earnTokens: [],
      earnOutputTokens: [],
      earnTokensByChainIdAndAddress: {},
      earnOutputTokensByChainIdAndAddress: {},
      earnTokenPairsByChainIdAndAddress: {},
      earnOutputTokenPairsByChainIdAndAddress: {},
      earnableTotalFiatNumber: 0,
      earnableTotalFiatFormatted: renderFiat(0, currentCurrency, 0),
    };

    if (!isPortfolioViewEnabled()) {
      return emptyEarnTokensData;
    }

    // flatten the tokens across all chains
    const allTokens = Object.values(
      accountTokensAcrossChains,
    ).flat() as TokenI[];

    if (allTokens.length === 0) {
      return emptyEarnTokensData;
    }

    const lendingMarketsByChainIdAndTokenAddress =
      selectLendingMarketsByChainIdAndTokenAddress(earnState);
    const lendingMarketsByChainIdAndOutputTokenAddress =
      selectLendingMarketsByChainIdAndOutputTokenAddress(earnState);

    const earnTokensData = allTokens.reduce((acc, token) => {
      const experiences: EarnTokenDetails['experiences'] = [];
      const decimalChainId = getDecimalChainId(token.chainId);
      const lendingMarketsForToken =
        lendingMarketsByChainIdAndTokenAddress?.[decimalChainId]?.[
          token.address.toLowerCase()
        ] || [];
      const lendingMarketsForOutputToken =
        lendingMarketsByChainIdAndOutputTokenAddress?.[decimalChainId]?.[
          token.address.toLowerCase()
        ] || [];
      const pooledStakingVaultForChain =
        pooledStakingPerChain?.[decimalChainId]?.vaultMetadata;
      const pooledStakingVaultAprForChain = parseFloat(
        pooledStakingPerChain?.[decimalChainId]?.vaultApy.apyPercentString,
      ).toString();

      const isStakingSupportedChain =
        isSupportedPooledStakingChain(decimalChainId);
      const isLendingToken = lendingMarketsForToken.length > 0;
      const isLendingOutputToken = lendingMarketsForOutputToken.length > 0;
      const isStakingToken =
        token.isETH && !token.isStaked && isStakingSupportedChain;
      const isStakingOutputToken =
        token.isETH && token.isStaked && isStakingSupportedChain;
      const isEarnToken = isStakingToken || isLendingToken;
      const isEarnOutputToken = isStakingOutputToken || isLendingOutputToken;

      if (!isEarnToken && !isEarnOutputToken) {
        return acc;
      }

      // TODO: balance logic, extract to utils then use when we are clear to add token
      const formattedAddress = toFormattedAddress(selectedAddress as Hex);
      const rawAccountBalance = selectedAddress
        ? accountsByChainId[token?.chainId as Hex]?.[formattedAddress]?.balance
        : '0';
      const rawStakedAccountBalance = selectedAddress
        ? accountsByChainId[token?.chainId as Hex]?.[formattedAddress]
            ?.stakedBalance
        : '0';
      const balanceWei = hexToBN(rawAccountBalance);
      const stakedBalanceWei = hexToBN(rawStakedAccountBalance);

      const tokenBalanceMinimalUnit = token.isETH
        ? token.isStaked
          ? stakedBalanceWei
          : balanceWei
        : hexToBN(
            tokenBalances?.[selectedAddress as Hex]?.[token.chainId as Hex]?.[
              token.address as Hex
            ],
          );

      const nativeCurrency =
        networkConfigs?.[token.chainId as Hex]?.nativeCurrency;
      const tokenExchangeRates = marketData?.[token.chainId as Hex] || {};

      const tokenToEthExchangeRate =
        tokenExchangeRates[token?.address as Hex]?.price ?? 0;

      const ethToUsdConversionRate =
        currencyRates?.[nativeCurrency]?.usdConversionRate ?? 0;
      // Token -> USD exchange rate needed for AAVE v3 risk-aware withdrawal calculations.
      const tokenUsdExchangeRate = new BigNumber(ethToUsdConversionRate)
        .multipliedBy(tokenToEthExchangeRate)
        .dividedBy(1)
        .toNumber();

      const ethToUserSelectedFiatConversionRate =
        currencyRates?.[nativeCurrency]?.conversionRate ?? 0;
      const balanceFiatNumber = weiToFiatNumber(
        balanceWei.toString(),
        ethToUsdConversionRate,
        2,
      );
      const { balanceValueFormatted, balanceFiat, balanceFiatCalculation } =
        deriveBalanceFromAssetMarketDetails(
          token,
          tokenExchangeRates,
          tokenBalances?.[selectedAddress as Hex]?.[token.chainId as Hex] || {},
          ethToUserSelectedFiatConversionRate,
          currentCurrency || '',
        );

      let assetBalanceFiatNumber = balanceFiatNumber;
      if (!token.isETH) {
        assetBalanceFiatNumber =
          !balanceFiatCalculation || isNaN(balanceFiatCalculation)
            ? 0
            : balanceFiatCalculation;
      }

      const assetTicker = token?.ticker || token.symbol;
      // is pooled staking enabled and eligible
      // TODO: This is a temporary fix for when pooled stkaing and lending are disabled
      // it allows Eth to still be seen as an earn token to get earn token details
      // if (isPooledStakingEnabled && isPooledStakingEligible) {
      // TODO: we could add direct validator staking as an additional earn experience
      if (isStakingToken || isStakingOutputToken) {
        experiences.push({
          type: EARN_EXPERIENCES.POOLED_STAKING,
          apr: pooledStakingVaultAprForChain,
          ...getEstimatedAnnualRewards(
            pooledStakingVaultAprForChain,
            assetBalanceFiatNumber,
            tokenBalanceMinimalUnit.toString(),
            currentCurrency,
            token.decimals,
            assetTicker,
          ),
          vault: pooledStakingVaultForChain,
        });
      }
      // }

      // is stablecoin lending enabled and eligible
      if (isStablecoinLendingEnabled && isStablecoinLendingEligible) {
        if (isLendingToken) {
          for (const market of lendingMarketsForToken) {
            experiences.push({
              type: EARN_EXPERIENCES.STABLECOIN_LENDING,
              apr: String(market.netSupplyRate.toFixed(1)),
              ...getEstimatedAnnualRewards(
                String(market.netSupplyRate),
                assetBalanceFiatNumber,
                tokenBalanceMinimalUnit.toString(),
                currentCurrency,
                token.decimals,
                assetTicker,
              ),
              market,
            });
          }
        }
      }
      if (isLendingOutputToken) {
        for (const market of lendingMarketsForOutputToken) {
          experiences.push({
            type: EARN_EXPERIENCES.STABLECOIN_LENDING,
            apr: String(market.netSupplyRate),
            ...getEstimatedAnnualRewards(
              String(market.netSupplyRate),
              assetBalanceFiatNumber,
              tokenBalanceMinimalUnit.toString(),
              currentCurrency,
              token.decimals,
              assetTicker,
            ),
            market,
          });
        }
      }

      if (experiences.length > 0) {
        // sort experiences by most lucrative
        // also there will prob ony be one experience per token in lending v1
        experiences.sort((a, b) => Number(b.apr) - Number(a.apr));

        const earnTokenDetails: EarnTokenDetails = {
          ...token,
          // minimal unit balance of the asset, the most accurate
          // i.e. 1000000 would = 1 USDC with 6 decimals
          balanceMinimalUnit: new BN4(
            tokenBalanceMinimalUnit.toString(),
          ).toString(),
          // formatted ui balance of the asset with ticker
          // i.e. 1 ETH or 100.12345 USDC or < 0.00001 ETH
          balanceFormatted: balanceValueFormatted,
          // formatted ui fiat balance of the asset
          // i.e. $100.12 USD or < $0.01 USD
          balanceFiat,
          // fiat balance of the asset in number format, the most accurate
          // i.e. 100.12345
          balanceFiatNumber: assetBalanceFiatNumber,
          tokenUsdExchangeRate,
          get experience() {
            return this.experiences[0];
          },
          // asset apr info per experience
          // i.e. 4.5%
          // estimated annual rewards per experience
          // formatted with currency symbol for current currency
          // i.e. $2.12 or £0.00
          experiences,
        };

        if (isEarnToken) {
          acc.earnTokens.push(earnTokenDetails);
          acc.earnTokensByChainIdAndAddress[decimalChainId] ??= {};
          acc.earnTokensByChainIdAndAddress[decimalChainId][
            token.address.toLowerCase()
          ] = earnTokenDetails;
          acc.earnableTotalFiatNumber +=
            earnTokenDetails.experience.estimatedAnnualRewardsFiatNumber;
        }
        if (isEarnOutputToken) {
          acc.earnOutputTokens.push(earnTokenDetails);
          acc.earnOutputTokensByChainIdAndAddress[decimalChainId] ??= {};
          acc.earnOutputTokensByChainIdAndAddress[decimalChainId][
            token.address.toLowerCase()
          ] = earnTokenDetails;
        }

        for (const experience of experiences) {
          if (isEarnOutputToken) {
            let addressToHash;
            if (isStakingOutputToken) {
              addressToHash = earnTokenDetails.address;
            } else if (isLendingOutputToken) {
              addressToHash = experience?.market?.underlying?.address as Hex;
            }
            if (!addressToHash) {
              continue;
            }
            addressToHash = addressToHash.toLowerCase();
            acc.earnTokenPairsByChainIdAndAddress[decimalChainId] ??= {};
            acc.earnTokenPairsByChainIdAndAddress[decimalChainId][
              addressToHash
            ] ??= [];
            acc.earnTokenPairsByChainIdAndAddress[decimalChainId][
              addressToHash
            ].push(earnTokenDetails);
          }
          if (isEarnToken) {
            let addressToHash;
            if (isStakingToken) {
              addressToHash = earnTokenDetails.address;
            } else if (isLendingToken) {
              addressToHash = experience?.market?.outputToken?.address as Hex;
            }
            if (!addressToHash) {
              continue;
            }
            addressToHash = addressToHash.toLowerCase();
            acc.earnOutputTokenPairsByChainIdAndAddress[decimalChainId] ??= {};
            acc.earnOutputTokenPairsByChainIdAndAddress[decimalChainId][
              addressToHash
            ] ??= [];
            acc.earnOutputTokenPairsByChainIdAndAddress[decimalChainId][
              addressToHash
            ].push(earnTokenDetails);
          }
        }
      }
      return acc;
    }, emptyEarnTokensData);

    earnTokensData.earnableTotalFiatFormatted = renderFiat(
      earnTokensData.earnableTotalFiatNumber,
      currentCurrency,
      0,
    );

    // Tokens with a balance of 0 are placed at the end of each earn token list.
    for (const tokens of [
      earnTokensData.earnTokens,
      earnTokensData.earnOutputTokens,
    ]) {
      tokens.sort((a, b) => {
        const fiatBalanceA = parseFloat(a.balanceFormatted);
        const fiatBalanceB = parseFloat(b.balanceFormatted);
        return (fiatBalanceA === 0 ? 1 : 0) - (fiatBalanceB === 0 ? 1 : 0);
      });
    }

    return earnTokensData;
  },
);

const selectEarnToken = createSelector(
  [selectEarnTokens, (_state: RootState, asset: TokenI) => asset],
  (earnTokens, asset) => {
    if (!asset) return;
    if (!asset.chainId) return;
    if (!asset.address) return;
    const earnToken =
      earnTokens.earnTokensByChainIdAndAddress?.[
        getDecimalChainId(asset.chainId)
      ]?.[asset.address.toLowerCase()];
    if (asset?.isETH && asset?.isStaked !== earnToken?.isStaked) return;
    return earnToken;
  },
);

const selectEarnOutputToken = createSelector(
  [selectEarnTokens, (_state: RootState, asset: TokenI) => asset],
  (earnTokens, asset) => {
    if (!asset) return;
    if (!asset.chainId) return;
    if (!asset.address) return;
    const outputToken =
      earnTokens.earnOutputTokensByChainIdAndAddress?.[
        getDecimalChainId(asset.chainId)
      ]?.[asset.address.toLowerCase()];
    if (asset?.isETH && asset?.isStaked !== outputToken?.isStaked) return;
    return outputToken;
  },
);

const selectPairedEarnOutputToken = createSelector(
  [selectEarnTokens, (_state: RootState, asset: TokenI) => asset],
  (earnTokensData, earnToken) => {
    if (!earnToken) return;
    if (!earnToken.chainId) return;
    if (!earnToken.address) return;
    const pairedEarnOutputToken =
      earnTokensData.earnTokenPairsByChainIdAndAddress?.[
        Number(earnToken.chainId)
      ]?.[earnToken.address.toLowerCase()]?.[0];
    if (
      earnToken.isETH &&
      earnToken.isStaked === pairedEarnOutputToken?.isStaked
    )
      return;

    return pairedEarnOutputToken;
  },
);

const selectPairedEarnToken = createSelector(
  [selectEarnTokens, (_state: RootState, asset: TokenI) => asset],
  (earnTokensData, earnOutputToken) => {
    if (!earnOutputToken) return;
    if (!earnOutputToken.chainId) return;
    if (!earnOutputToken.address) return;
    const pairedEarnToken =
      earnTokensData.earnOutputTokenPairsByChainIdAndAddress?.[
        Number(earnOutputToken.chainId)
      ]?.[earnOutputToken.address.toLowerCase()]?.[0];
    if (
      earnOutputToken.isETH &&
      earnOutputToken.isStaked === pairedEarnToken?.isStaked
    )
      return;
    return pairedEarnToken;
  },
);

const selectEarnTokenPair = createSelector(
  [
    (_state: RootState, asset: TokenI) => asset,
    selectEarnToken,
    selectEarnOutputToken,
    selectPairedEarnToken,
    selectPairedEarnOutputToken,
  ],
  (
    _asset,
    earnToken,
    earnOutputToken,
    pairedEarnToken,
    pairedEarnOutputToken,
  ) => {
    let earnTokenToUse;
    let outputTokenToUse;
    if (earnToken) {
      earnTokenToUse = earnToken;
      outputTokenToUse = pairedEarnOutputToken;
    } else if (earnOutputToken) {
      outputTokenToUse = earnOutputToken;
      earnTokenToUse = pairedEarnToken;
    }
    return {
      earnToken: earnTokenToUse,
      outputToken: outputTokenToUse,
    };
  },
);

export const earnSelectors = {
  selectEarnControllerState,
  selectEarnTokens,
  selectEarnToken,
  selectEarnOutputToken,
  selectEarnTokenPair,
  selectPairedEarnToken,
  selectPairedEarnOutputToken,
};
