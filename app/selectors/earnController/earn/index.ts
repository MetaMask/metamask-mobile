import { Hex } from '@metamask/utils';
import BN4 from 'bnjs4';
import { createSelector } from 'reselect';
import { selectAccountTokensAcrossChains } from '../../multichain';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../currencyRateController';
import { selectAccountsByChainId } from '../../accountTrackerController';
import {
  selectEvmChainId,
  selectNetworkConfigurations,
} from '../../networkController';
import { selectSelectedInternalAccountAddress } from '../../accountsController';
import { selectTokenMarketData } from '../../tokenRatesController';
import { selectTokensBalances } from '../../tokenBalancesController';
import {
  selectLendingMarketsByChainIdAndOutputTokenAddress,
  selectLendingMarketsByChainIdAndTokenAddress,
} from '../../../components/UI/Earn/hooks/useEarnTokens';
import { hexToBN, weiToFiatNumber } from '../../../util/number';
import { TokenI } from '../../../components/UI/Tokens/types';
import {
  getDecimalChainId,
  isPortfolioViewEnabled,
} from '../../../util/networks';
import { isSupportedPooledStakingChain } from '@metamask/stake-sdk/dist/contracts/PooledStaking/utils.mjs';
import BigNumber from 'bignumber.js';
import { deriveBalanceFromAssetMarketDetails } from '../../../components/UI/Tokens/util/deriveBalanceFromAssetMarketDetails';
import { EARN_EXPERIENCES } from '../../../components/UI/Earn/constants/experiences';
import { getEstimatedAnnualRewardsFormatted } from '../../../components/UI/Earn/utils/token';
import { pooledStakingSelectors } from '../pooledStaking';
import { RootState } from '../../../reducers';

import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../components/UI/Earn/selectors/featureFlags';
import { EarnTokenDetails } from '../../../components/UI/Earn/types/lending.types';
import { createDeepEqualSelector } from '../../util';
import { toChecksumAddress } from 'ethereumjs-util';

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
    selectSelectedInternalAccountAddress,
    selectCurrentCurrency,
    selectNetworkConfigurations,
    selectAccountTokensAcrossChains,
    selectCurrencyRates,
    selectAccountsByChainId,
    selectEvmChainId,
  ],
  (
    earnState,
    isPooledStakingEnabled,
    isStablecoinLendingEnabled,
    pooledStakingPerChain,
    isPooledStakingEligible,
    tokenBalances,
    marketData,
    selectedAddress,
    currentCurrency,
    networkConfigs,
    accountTokensAcrossChains,
    currencyRates,
    accountsByChainId,
    selectedChainId,
  ) => ({
    earnState,
    isPooledStakingEnabled,
    isStablecoinLendingEnabled,
    pooledStakingPerChain,
    isPooledStakingEligible,
    tokenBalances,
    marketData,
    selectedAddress,
    currentCurrency,
    networkConfigs,
    accountTokensAcrossChains,
    currencyRates,
    accountsByChainId,
    selectedChainId,
  }),
);

const selectEarnTokens = createDeepEqualSelector(
  selectEarnTokenBaseData,
  (earnTokenBaseData) => {
    const {
      earnState,
      isPooledStakingEnabled,
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
      selectedChainId,
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
    } = {
      earnTokens: [],
      earnOutputTokens: [],
      earnTokensByChainIdAndAddress: {},
      earnOutputTokensByChainIdAndAddress: {},
      earnTokenPairsByChainIdAndAddress: {},
      earnOutputTokenPairsByChainIdAndAddress: {},
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

    const rawAccountBalance = selectedAddress
      ? accountsByChainId[selectedChainId]?.[toChecksumAddress(selectedAddress)]
          ?.balance
      : '0';
    const balanceWei = hexToBN(rawAccountBalance);
    console.log('balanceWei', balanceWei.toString());
    console.log('selectedAddress', selectedAddress);
    console.log('accountsByChainId', accountsByChainId);
    // const lendingMarketsWithPosition =
    //   selectLendingMarketsWithPosition(earnState);
    // console.log(
    //   'LENDING MARKETS WITH POSITION',
    //   JSON.stringify(lendingMarketsWithPosition, null, 2),
    // );
    // const marketsByProtocolAndId =
    //   selectLendingMarketsByProtocolAndId(earnState);
    // console.log(
    //   'MARKETS BY PROTOCOL AND ID',
    //   JSON.stringify(marketsByProtocolAndId, null, 2),
    // );
    // const lendingPositionsWithMarket =
    //   selectLendingPositionsWithMarket(earnState);
    // console.log(
    //   'SELECT LENDING POSITIONS WITH MARKET',
    //   JSON.stringify(lendingPositionsWithMarket, null, 2),
    // );
    // console.log('earnState', JSON.stringify(earnState, null, 2));
    const lendingMarketsByChainIdAndTokenAddress =
      selectLendingMarketsByChainIdAndTokenAddress(earnState);
    const lendingMarketsByChainIdAndOutputTokenAddress =
      selectLendingMarketsByChainIdAndOutputTokenAddress(earnState);
    // console.log(
    //   'lendingMarketsByChainIdAndTokenAddress',
    //   JSON.stringify(lendingMarketsByChainIdAndTokenAddress, null, 2),
    // );
    // console.log(
    //   'lendingMarketsByChainIdAndOutputTokenAddress',
    //   JSON.stringify(lendingMarketsByChainIdAndOutputTokenAddress, null, 2),
    // );

    const earnTokensData = allTokens.reduce((acc, token) => {
      const experiences = [];
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
      const tokenBalanceMinimalUnit = token.isETH
        ? balanceWei
        : hexToBN(
            tokenBalances?.[selectedAddress as Hex]?.[token.chainId as Hex]?.[
              token.address as Hex
            ],
          );
      console.log(
        'tokenBalanceMinimalUnit from deriveBalanceFromAssetMarketDetails',
        tokenBalanceMinimalUnit.toString(),
        balanceWei.toString(),
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

      // is pooled staking enabled and eligible
      if (isPooledStakingEnabled && isPooledStakingEligible) {
        // TODO: we could add direct validator staking as an additional earn experience
        if (isStakingToken || isStakingOutputToken) {
          experiences.push({
            type: EARN_EXPERIENCES.POOLED_STAKING,
            apr: pooledStakingVaultAprForChain,
            estimatedAnnualRewardsFormatted: getEstimatedAnnualRewardsFormatted(
              pooledStakingVaultAprForChain,
              assetBalanceFiatNumber,
              currentCurrency,
            ),
            vault: pooledStakingVaultForChain,
          });
        }
      }

      // is stablecoin lending enabled and eligible
      if (isStablecoinLendingEnabled && isStablecoinLendingEligible) {
        if (isLendingToken) {
          for (const market of lendingMarketsForToken) {
            experiences.push({
              type: EARN_EXPERIENCES.STABLECOIN_LENDING,
              apr: String(market.netSupplyRate.toFixed(1)),
              estimatedAnnualRewardsFormatted:
                getEstimatedAnnualRewardsFormatted(
                  String(market.netSupplyRate),
                  assetBalanceFiatNumber,
                  currentCurrency,
                ),
              market,
            });
          }
        }
        if (isLendingOutputToken) {
          for (const market of lendingMarketsForOutputToken) {
            experiences.push({
              type: EARN_EXPERIENCES.STABLECOIN_LENDING,
              apr: String(market.netSupplyRate),
              estimatedAnnualRewardsFormatted:
                getEstimatedAnnualRewardsFormatted(
                  String(market.netSupplyRate),
                  assetBalanceFiatNumber,
                  currentCurrency,
                ),
              market,
            });
          }
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

export const earnSelectors = {
  selectEarnControllerState,
  selectEarnTokens,
};
