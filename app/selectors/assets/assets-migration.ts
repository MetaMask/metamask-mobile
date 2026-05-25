import { createDeepEqualSelector } from '../util';
import { selectIsAssetsUnifyStateEnabled } from '../featureFlagController/assetsUnifyState';
import {
  type AccountTrackerControllerState,
  type CurrencyRateState,
  type MarketDataDetails,
  type MultichainAssetsControllerState,
  type MultichainAssetsRatesControllerState,
  type MultichainBalancesControllerState,
  type Token,
  type TokenBalancesControllerState,
  type TokenRatesControllerState,
  type TokensControllerState,
  getNativeTokenAddress,
} from '@metamask/assets-controllers';
import { isEvmAccountType } from '@metamask/keyring-api';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import {
  bigIntToHex,
  CaipAssetType,
  Hex,
  KnownCaipNamespace,
  parseCaipAssetType,
} from '@metamask/utils';
import { decimalToPrefixedHex } from '../../util/conversions';
import {
  AssetsControllerState,
  FungibleAssetPrice,
} from '@metamask/assets-controller';
import { AccountsControllerState } from '@metamask/accounts-controller';
import { NetworkState } from '@metamask/network-controller';

const isEmptyRecord = (record: Record<string, unknown> | undefined) =>
  !record || Object.keys(record).length === 0;

// ChainId (hex) -> AccountAddress (hex checksummed) -> Balance (hex)
export const getAccountTrackerControllerAccountsByChainId =
  createDeepEqualSelector(
    [
      selectIsAssetsUnifyStateEnabled,
      (state) =>
        state.engine?.backgroundState?.AccountTrackerController
          ?.accountsByChainId ?? {},
      (state) =>
        state.engine?.backgroundState?.AssetsController?.assetsBalance ?? {},
      (state) =>
        state.engine?.backgroundState?.AssetsController?.assetsInfo ?? {},
      (state) =>
        state.engine?.backgroundState?.AccountsController?.internalAccounts
          ?.accounts ?? {},
    ],
    (
      isAssetsUnifyStateEnabled: boolean,
      accountsByChainId: AccountTrackerControllerState['accountsByChainId'],
      assetsBalance: AssetsControllerState['assetsBalance'],
      assetsInfo: AssetsControllerState['assetsInfo'],
      internalAccountsById: AccountsControllerState['internalAccounts']['accounts'],
    ): AccountTrackerControllerState['accountsByChainId'] => {
      if (
        !isAssetsUnifyStateEnabled ||
        isEmptyRecord(assetsBalance) ||
        isEmptyRecord(assetsInfo)
      ) {
        return accountsByChainId;
      }

      const result: AccountTrackerControllerState['accountsByChainId'] = {};

      for (const [accountId, accountBalances] of Object.entries(
        assetsBalance,
      )) {
        const internalAccount = internalAccountsById[accountId];
        if (!internalAccount || !isEvmAccountType(internalAccount.type)) {
          continue;
        }

        const checksummedAddress = toChecksumHexAddress(
          internalAccount.address,
        );

        for (const [assetId, balanceData] of Object.entries(accountBalances)) {
          const metadata = assetsInfo[assetId];
          if (metadata?.type !== 'native') {
            continue;
          }

          const { chain: parsedChain } = parseCaipAssetType(
            assetId as CaipAssetType,
          );

          if (parsedChain.namespace !== KnownCaipNamespace.Eip155) {
            continue;
          }

          const hexChainId = decimalToPrefixedHex(parsedChain.reference);
          const amount = balanceData?.amount ?? '0';
          const legacyAccountInfo =
            accountsByChainId[hexChainId]?.[checksummedAddress] ??
            accountsByChainId[hexChainId]?.[internalAccount.address];

          result[hexChainId] ??= {};
          result[hexChainId][checksummedAddress] = {
            // TODO: Use raw value from state when available
            balance: parseBalanceWithDecimals(amount, metadata.decimals),
            ...(legacyAccountInfo?.stakedBalance
              ? { stakedBalance: legacyAccountInfo.stakedBalance }
              : {}),
          };
        }
      }

      return result;
    },
  );

// ChainId (hex) -> AccountAddress (hex lowercase) -> Array of Tokens
export const getTokensControllerAllTokens = createDeepEqualSelector(
  [
    selectIsAssetsUnifyStateEnabled,
    (state) => state.engine?.backgroundState?.TokensController?.allTokens ?? {},
    (state) =>
      state.engine?.backgroundState?.AssetsController?.assetsInfo ?? {},
    (state) =>
      state.engine?.backgroundState?.AssetsController?.assetsBalance ?? {},
    (state) =>
      state.engine?.backgroundState?.AssetsController?.customAssets ?? {},
    (state) =>
      state.engine?.backgroundState?.AccountsController?.internalAccounts
        ?.accounts ?? {},
  ],
  (
    isAssetsUnifyStateEnabled: boolean,
    allTokens: TokensControllerState['allTokens'],
    assetsInfo: AssetsControllerState['assetsInfo'],
    assetsBalance: AssetsControllerState['assetsBalance'],
    customAssets: AssetsControllerState['customAssets'],
    internalAccountsById: AccountsControllerState['internalAccounts']['accounts'],
  ): TokensControllerState['allTokens'] => {
    if (
      !isAssetsUnifyStateEnabled ||
      isEmptyRecord(assetsInfo) ||
      (isEmptyRecord(assetsBalance) && isEmptyRecord(customAssets))
    ) {
      return allTokens;
    }

    const result: TokensControllerState['allTokens'] = {};

    // Merge assetsBalance and customAssets: accountId -> assetId[]
    const allAssets = Object.fromEntries(
      [
        ...new Set([
          ...Object.keys(assetsBalance),
          ...Object.keys(customAssets),
        ]),
      ].map((accountId) => {
        const fromBalance = Object.keys(assetsBalance[accountId] ?? {});
        const fromCustom = customAssets[accountId] ?? [];
        return [
          accountId,
          [...new Set([...fromBalance, ...fromCustom])] as CaipAssetType[],
        ];
      }),
    );

    for (const [accountId, assetIds] of Object.entries(allAssets)) {
      const internalAccount = internalAccountsById[accountId];
      if (!internalAccount || !isEvmAccountType(internalAccount.type)) {
        continue;
      }

      for (const assetId of assetIds) {
        const metadata = assetsInfo[assetId];
        if (!metadata || metadata.type === 'native') {
          continue;
        }

        const assetType = parseCaipAssetType(assetId);

        if (assetType.chain.namespace !== KnownCaipNamespace.Eip155) {
          continue;
        }

        const hexChainId = decimalToPrefixedHex(
          assetType.chain.reference,
        ) as Hex;
        const assetAddress = toChecksumHexAddress(assetType.assetReference);

        const token: Token = {
          address: assetAddress,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
          name: metadata.name,
          image: metadata.image,
          ...(metadata.aggregators
            ? { aggregators: metadata.aggregators }
            : {}),
        };

        result[hexChainId] ??= {};
        result[hexChainId][internalAccount.address] ??= [];
        result[hexChainId][internalAccount.address].push(token);
      }
    }

    return result;
  },
);

// ChainId (hex) -> AccountAddress (hex lowercase) -> Array of TokenAddress (hex lowercase)
export const getTokensControllerAllIgnoredTokens = createDeepEqualSelector(
  [
    selectIsAssetsUnifyStateEnabled,
    (state) =>
      state.engine?.backgroundState?.TokensController?.allIgnoredTokens ?? {},
    (state) =>
      state.engine?.backgroundState?.AssetsController?.assetPreferences ?? {},
    (state) =>
      state.engine?.backgroundState?.AccountsController?.internalAccounts
        ?.accounts ?? {},
  ],
  (
    isAssetsUnifyStateEnabled: boolean,
    allIgnoredTokens: TokensControllerState['allIgnoredTokens'],
    assetPreferences: AssetsControllerState['assetPreferences'],
    internalAccountsById: AccountsControllerState['internalAccounts']['accounts'],
  ): TokensControllerState['allIgnoredTokens'] => {
    if (!isAssetsUnifyStateEnabled || isEmptyRecord(assetPreferences)) {
      return allIgnoredTokens;
    }

    const result: TokensControllerState['allIgnoredTokens'] = {};

    for (const [assetId, { hidden }] of Object.entries(assetPreferences)) {
      if (!hidden) {
        continue;
      }

      const assetType = parseCaipAssetType(assetId as CaipAssetType);
      if (assetType.chain.namespace !== KnownCaipNamespace.Eip155) {
        continue;
      }

      const hexChainId = decimalToPrefixedHex(assetType.chain.reference) as Hex;

      // The asset is hidden for all EVM accounts
      for (const internalAccount of Object.values(internalAccountsById)) {
        if (!isEvmAccountType(internalAccount.type)) {
          continue;
        }

        result[hexChainId] ??= {};
        result[hexChainId][internalAccount.address] ??= [];
        result[hexChainId][internalAccount.address].push(
          assetType.assetReference,
        );
      }
    }

    return result;
  },
);

// AcountAddress (hex lowercase) -> ChainId (hex) -> TokenAddress (hex checksummed) -> Balance (hex)
export const getTokenBalancesControllerTokenBalances = createDeepEqualSelector(
  [
    selectIsAssetsUnifyStateEnabled,
    (state) =>
      state.engine?.backgroundState?.TokenBalancesController?.tokenBalances ??
      {},
    (state) =>
      state.engine?.backgroundState?.AssetsController?.assetsInfo ?? {},
    (state) =>
      state.engine?.backgroundState?.AssetsController?.assetsBalance ?? {},
    (state) =>
      state.engine?.backgroundState?.AssetsController?.customAssets ?? {},
    (state) =>
      state.engine?.backgroundState?.AccountsController?.internalAccounts
        ?.accounts ?? {},
  ],
  (
    isAssetsUnifyStateEnabled: boolean,
    tokenBalances: TokenBalancesControllerState['tokenBalances'],
    assetsInfo: AssetsControllerState['assetsInfo'],
    assetsBalance: AssetsControllerState['assetsBalance'],
    customAssets: AssetsControllerState['customAssets'],
    internalAccountsById: AccountsControllerState['internalAccounts']['accounts'],
  ): TokenBalancesControllerState['tokenBalances'] => {
    if (
      !isAssetsUnifyStateEnabled ||
      isEmptyRecord(assetsInfo) ||
      (isEmptyRecord(assetsBalance) && isEmptyRecord(customAssets))
    ) {
      return tokenBalances;
    }

    const result: TokenBalancesControllerState['tokenBalances'] = {};
    for (const [accountId, chainIdBalances] of Object.entries(assetsBalance)) {
      const internalAccount = internalAccountsById[accountId];
      if (!internalAccount || !isEvmAccountType(internalAccount.type)) {
        continue;
      }

      const accountAddress = internalAccount.address as Hex;
      result[accountAddress] ??= {};

      for (const [assetId, assetBalance] of Object.entries(chainIdBalances)) {
        const metadata = assetsInfo[assetId];
        if (!metadata) {
          continue;
        }

        const assetType = parseCaipAssetType(assetId as CaipAssetType);

        // TokenBalancesController is EVM-only; skip non-eip155 assets (e.g.
        // Solana) that can appear under the same account in unified state.
        // Otherwise `decimalToPrefixedHex` on a non-decimal reference yields
        // invalid keys such as `0xNaN`.
        if (assetType.chain.namespace !== KnownCaipNamespace.Eip155) {
          continue;
        }

        const hexChainId = decimalToPrefixedHex(
          assetType.chain.reference,
        ) as Hex;
        const assetAddress = toChecksumHexAddress(
          metadata.type === 'native'
            ? getNativeTokenAddress(hexChainId)
            : assetType.assetReference,
        ) as Hex;

        result[accountAddress][hexChainId] ??= {};
        result[accountAddress][hexChainId][assetAddress] =
          // TODO: Use raw value from state when available
          parseBalanceWithDecimals(assetBalance.amount, metadata.decimals);
      }
    }

    // Custom EVM tokens may have metadata (assetsInfo) but no balance
    // in assetsBalance yet (the async fetch hasn't completed).  Add a
    // zero-balance placeholder so selectAllEvmAssets doesn't filter them out.
    for (const [accountId, assetIds] of Object.entries(customAssets)) {
      const internalAccount = internalAccountsById[accountId];
      if (!internalAccount || !isEvmAccountType(internalAccount.type)) {
        continue;
      }

      const accountAddress = internalAccount.address as Hex;
      result[accountAddress] ??= {};
      const accountBalances = assetsBalance[accountId] ?? {};

      for (const assetId of assetIds) {
        if (accountBalances[assetId]) {
          continue;
        }

        const metadata = assetsInfo[assetId];
        if (!metadata || metadata.type === 'native') {
          continue;
        }

        const assetType = parseCaipAssetType(assetId);

        if (assetType.chain.namespace !== KnownCaipNamespace.Eip155) {
          continue;
        }

        const hexChainId = decimalToPrefixedHex(
          assetType.chain.reference,
        ) as Hex;
        const assetAddress = toChecksumHexAddress(
          assetType.assetReference,
        ) as Hex;

        if (!result[accountAddress]?.[hexChainId]?.[assetAddress]) {
          result[accountAddress][hexChainId] ??= {};
          result[accountAddress][hexChainId][assetAddress] =
            parseBalanceWithDecimals('0', metadata.decimals);
        }
      }
    }

    return result;
  },
);

// AccountId -> Array of AssetIds
export const getMultiChainAssetsControllerAccountsAssets =
  createDeepEqualSelector(
    [
      selectIsAssetsUnifyStateEnabled,
      (state) =>
        state.engine?.backgroundState?.MultichainAssetsController
          ?.accountsAssets ?? {},
      (state) =>
        state.engine?.backgroundState?.AssetsController?.assetsBalance ?? {},
      (state) =>
        state.engine?.backgroundState?.AssetsController?.customAssets ?? {},
      (state) =>
        state.engine?.backgroundState?.AccountsController?.internalAccounts
          ?.accounts ?? {},
    ],
    (
      isAssetsUnifyStateEnabled: boolean,
      accountsAssets: MultichainAssetsControllerState['accountsAssets'],
      assetsBalance: AssetsControllerState['assetsBalance'],
      customAssets: AssetsControllerState['customAssets'],
      internalAccountsById: AccountsControllerState['internalAccounts']['accounts'],
    ): MultichainAssetsControllerState['accountsAssets'] => {
      if (
        !isAssetsUnifyStateEnabled ||
        (isEmptyRecord(assetsBalance) && isEmptyRecord(customAssets))
      ) {
        return accountsAssets;
      }

      const result: MultichainAssetsControllerState['accountsAssets'] = {
        ...accountsAssets,
      };

      // Merge assetsBalance and customAssets: accountId -> assetId[]
      const allAssets = Object.fromEntries(
        [
          ...new Set([
            ...Object.keys(assetsBalance),
            ...Object.keys(customAssets),
          ]),
        ].map((accountId) => {
          const fromBalance = Object.keys(assetsBalance[accountId] ?? {});
          const fromCustom = customAssets[accountId] ?? [];
          return [
            accountId,
            [...new Set([...fromBalance, ...fromCustom])] as CaipAssetType[],
          ];
        }),
      );

      for (const [accountId, assetIds] of Object.entries(allAssets)) {
        const internalAccount = internalAccountsById[accountId];
        if (!internalAccount || isEvmAccountType(internalAccount.type)) {
          continue;
        }

        result[accountId] ??= [];

        for (const assetId of assetIds) {
          const assetType = parseCaipAssetType(assetId);
          if (assetType.chain.namespace === KnownCaipNamespace.Eip155) {
            continue;
          }

          if (!result[accountId].includes(assetId)) {
            result[accountId].push(assetId);
          }
        }
      }

      return result;
    },
  );

// TODO There are issues with the new image url not matching the one in assetsMetadata iconUrl
// AssetId -> AssetMetadata
export const getMultiChainAssetsControllerAssetsMetadata =
  createDeepEqualSelector(
    [
      selectIsAssetsUnifyStateEnabled,
      (state) =>
        state.engine?.backgroundState?.MultichainAssetsController
          ?.assetsMetadata ?? {},
      (state) =>
        state.engine?.backgroundState?.AssetsController?.assetsInfo ?? {},
    ],
    (
      isAssetsUnifyStateEnabled: boolean,
      assetsMetadata: MultichainAssetsControllerState['assetsMetadata'],
      assetsInfo: AssetsControllerState['assetsInfo'],
    ): MultichainAssetsControllerState['assetsMetadata'] => {
      if (!isAssetsUnifyStateEnabled || isEmptyRecord(assetsInfo)) {
        return assetsMetadata;
      }

      const result: MultichainAssetsControllerState['assetsMetadata'] = {
        ...assetsMetadata,
      };

      for (const [assetId, metadata] of Object.entries(assetsInfo)) {
        const assetType = parseCaipAssetType(assetId as CaipAssetType);
        if (assetType.chain.namespace === KnownCaipNamespace.Eip155) {
          continue;
        }

        result[assetId as CaipAssetType] = {
          fungible: true,
          iconUrl: metadata.image ?? '',
          units: [
            {
              decimals: metadata.decimals,
              symbol: metadata.symbol,
              name: metadata.name,
            },
          ],
          symbol: metadata.symbol,
          name: metadata.name,
        };
      }

      return result;
    },
  );

// AccountId -> Array of AssetIds
export const getMultiChainAssetsControllerAllIgnoredAssets =
  createDeepEqualSelector(
    [
      selectIsAssetsUnifyStateEnabled,
      (state) =>
        state.engine?.backgroundState?.MultichainAssetsController
          ?.allIgnoredAssets ?? {},
      (state) =>
        state.engine?.backgroundState?.AssetsController?.assetPreferences ?? {},
      (state) =>
        state.engine?.backgroundState?.AccountsController?.internalAccounts
          ?.accounts ?? {},
    ],
    (
      isAssetsUnifyStateEnabled: boolean,
      allIgnoredAssets: MultichainAssetsControllerState['allIgnoredAssets'],
      assetPreferences: AssetsControllerState['assetPreferences'],
      internalAccountsById: AccountsControllerState['internalAccounts']['accounts'],
    ): MultichainAssetsControllerState['allIgnoredAssets'] => {
      if (!isAssetsUnifyStateEnabled || isEmptyRecord(assetPreferences)) {
        return allIgnoredAssets;
      }

      const result: MultichainAssetsControllerState['allIgnoredAssets'] = {};

      for (const accountId of Object.keys(internalAccountsById)) {
        const internalAccount = internalAccountsById[accountId];
        if (!internalAccount || isEvmAccountType(internalAccount.type)) {
          continue;
        }

        result[accountId] = [];

        for (const [assetId, { hidden }] of Object.entries(assetPreferences)) {
          if (!hidden) {
            continue;
          }

          const assetType = parseCaipAssetType(assetId as CaipAssetType);
          if (assetType.chain.namespace === KnownCaipNamespace.Eip155) {
            continue;
          }

          result[accountId].push(assetId as CaipAssetType);
        }
      }

      return result;
    },
  );

// AccountId -> AssetId -> Balance (amount + unit)
export const getMultiChainBalancesControllerBalances = createDeepEqualSelector(
  [
    selectIsAssetsUnifyStateEnabled,
    (state) =>
      state.engine?.backgroundState?.MultichainBalancesController?.balances ??
      {},
    (state) =>
      state.engine?.backgroundState?.AssetsController?.assetsBalance ?? {},
    (state) =>
      state.engine?.backgroundState?.AssetsController?.assetsInfo ?? {},
    (state) =>
      state.engine?.backgroundState?.AccountsController?.internalAccounts
        ?.accounts ?? {},
  ],
  (
    isAssetsUnifyStateEnabled: boolean,
    balances: MultichainBalancesControllerState['balances'],
    assetsBalance: AssetsControllerState['assetsBalance'],
    assetsInfo: AssetsControllerState['assetsInfo'],
    internalAccountsById: AccountsControllerState['internalAccounts']['accounts'],
  ): MultichainBalancesControllerState['balances'] => {
    if (
      !isAssetsUnifyStateEnabled ||
      isEmptyRecord(assetsBalance) ||
      isEmptyRecord(assetsInfo)
    ) {
      return balances;
    }

    const result: MultichainBalancesControllerState['balances'] = {
      ...balances,
    };

    for (const [accountId, chainIdBalances] of Object.entries(assetsBalance)) {
      const internalAccount = internalAccountsById[accountId];
      if (!internalAccount || isEvmAccountType(internalAccount.type)) {
        continue;
      }

      result[accountId] ??= {};

      for (const [assetId, balance] of Object.entries(chainIdBalances)) {
        const assetType = parseCaipAssetType(assetId as CaipAssetType);
        const metadata = assetsInfo[assetId];

        if (
          !metadata ||
          assetType.chain.namespace === KnownCaipNamespace.Eip155
        ) {
          continue;
        }

        result[accountId][assetId] = {
          amount: balance.amount,
          unit: metadata.symbol,
        };
      }
    }

    return result;
  },
);

export const getCurrencyRateControllerCurrentCurrency = createDeepEqualSelector(
  [
    selectIsAssetsUnifyStateEnabled,
    (state) =>
      state.engine?.backgroundState?.CurrencyRateController?.currentCurrency,
    (state) =>
      state.engine?.backgroundState?.AssetsController?.selectedCurrency,
  ],
  (
    isAssetsUnifyStateEnabled: boolean,
    currentCurrency: CurrencyRateState['currentCurrency'],
    selectedCurrency: AssetsControllerState['selectedCurrency'],
  ): CurrencyRateState['currentCurrency'] => {
    if (!isAssetsUnifyStateEnabled || selectedCurrency === undefined) {
      return currentCurrency;
    }

    return selectedCurrency;
  },
);

// Native Symbol -> Rates (conversionRate, usdConversionRate, conversionDate)
export const getCurrencyRateControllerCurrencyRates = createDeepEqualSelector(
  [
    selectIsAssetsUnifyStateEnabled,
    (state) =>
      state.engine?.backgroundState?.CurrencyRateController?.currencyRates ??
      {},
    (state) =>
      state.engine?.backgroundState?.AssetsController?.assetsInfo ?? {},
    (state) =>
      state.engine?.backgroundState?.AssetsController?.assetsPrice ?? {},
  ],
  (
    isAssetsUnifyStateEnabled: boolean,
    currencyRates: CurrencyRateState['currencyRates'],
    assetsInfo: AssetsControllerState['assetsInfo'],
    assetsPrice: AssetsControllerState['assetsPrice'],
  ): CurrencyRateState['currencyRates'] => {
    if (
      !isAssetsUnifyStateEnabled ||
      isEmptyRecord(assetsInfo) ||
      isEmptyRecord(assetsPrice)
    ) {
      return currencyRates;
    }

    const result: CurrencyRateState['currencyRates'] = {};

    // Sorting just to ensure that we process mainnet (eip155:1) first
    for (const [assetId, metadata] of Object.entries(assetsInfo).sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      // Skip if we already have an entry for this symbol
      if (result[metadata.symbol]) {
        continue;
      }

      const assetType = parseCaipAssetType(assetId as CaipAssetType);

      // Skip if not a native asset or not evm
      if (
        metadata.type !== 'native' ||
        assetType.chain.namespace !== KnownCaipNamespace.Eip155
      ) {
        continue;
      }

      const price = assetsPrice[assetId];

      if (price?.assetPriceType !== 'fungible') {
        continue;
      }

      result[metadata.symbol] = {
        conversionDate: price.lastUpdated / 1000,
        conversionRate: price.price,
        usdConversionRate: price.usdPrice,
      };
    }

    return result;
  },
);

// ChainId (hex) -> TokenAddress (hex checksummed) -> MarketData
export const getTokenRatesControllerMarketData = createDeepEqualSelector(
  [
    selectIsAssetsUnifyStateEnabled,
    (state) =>
      state.engine?.backgroundState?.TokenRatesController?.marketData ?? {},
    (state) =>
      state.engine?.backgroundState?.AssetsController?.assetsPrice ?? {},
    (state) =>
      state.engine?.backgroundState?.AssetsController?.assetsInfo ?? {},
    getCurrencyRateControllerCurrencyRates,
    (state) =>
      state.engine?.backgroundState?.NetworkController
        ?.networkConfigurationsByChainId ?? {},
  ],
  (
    isAssetsUnifyStateEnabled: boolean,
    marketData: TokenRatesControllerState['marketData'],
    assetsPrice: AssetsControllerState['assetsPrice'],
    assetsInfo: AssetsControllerState['assetsInfo'],
    currencyRates: CurrencyRateState['currencyRates'],
    networkConfigurationsByChainId: NetworkState['networkConfigurationsByChainId'],
  ): TokenRatesControllerState['marketData'] => {
    if (
      !isAssetsUnifyStateEnabled ||
      isEmptyRecord(assetsPrice) ||
      isEmptyRecord(assetsInfo)
    ) {
      return marketData;
    }

    const result: TokenRatesControllerState['marketData'] = {};

    for (const [assetId, price] of Object.entries(assetsPrice) as [
      CaipAssetType,
      FungibleAssetPrice, // TODO: A type discriminator to AssetPrice is needed to be added to avoid this cast, but it is safe for now
    ][]) {
      const assetType = parseCaipAssetType(assetId);

      if (assetType.chain.namespace !== KnownCaipNamespace.Eip155) {
        continue;
      }

      const metadata = assetsInfo[assetId];
      if (!metadata) {
        continue;
      }

      const hexChainId = decimalToPrefixedHex(assetType.chain.reference) as Hex;
      const nativeAssetSymbol =
        networkConfigurationsByChainId[hexChainId]?.nativeCurrency ?? 'NATIVE';

      const assetAddress = toChecksumHexAddress(
        metadata.type === 'native'
          ? getNativeTokenAddress(hexChainId)
          : assetType.assetReference,
      ) as Hex;

      const nativeCurrencyRate =
        currencyRates[nativeAssetSymbol]?.conversionRate;
      if (!nativeCurrencyRate) {
        continue;
      }

      const convertToNativeCurrency = (amount: number | undefined) =>
        amount === undefined ? undefined : amount / nativeCurrencyRate;

      result[hexChainId] ??= {};
      result[hexChainId][assetAddress] = {
        id: price.id,
        price: convertToNativeCurrency(price.price),
        marketCap: convertToNativeCurrency(price.marketCap),
        allTimeHigh: convertToNativeCurrency(price.allTimeHigh),
        allTimeLow: convertToNativeCurrency(price.allTimeLow),
        totalVolume: convertToNativeCurrency(price.totalVolume),
        high1d: convertToNativeCurrency(price.high1d),
        low1d: convertToNativeCurrency(price.low1d),
        circulatingSupply: price.circulatingSupply,
        dilutedMarketCap: convertToNativeCurrency(price.dilutedMarketCap),
        marketCapPercentChange1d: price.marketCapPercentChange1d,
        priceChange1d: price.priceChange1d,
        pricePercentChange1h: price.pricePercentChange1h,
        pricePercentChange1d: price.pricePercentChange1d,
        pricePercentChange7d: price.pricePercentChange7d,
        pricePercentChange14d: price.pricePercentChange14d,
        pricePercentChange30d: price.pricePercentChange30d,
        pricePercentChange200d: price.pricePercentChange200d,
        pricePercentChange1y: price.pricePercentChange1y,
        chainId: hexChainId,
        tokenAddress: assetAddress,
        assetId,
        currency: nativeAssetSymbol,
      } as MarketDataDetails;
    }

    return result;
  },
);

export const getMultichainAssetsRatesControllerConversionRates =
  createDeepEqualSelector(
    [
      selectIsAssetsUnifyStateEnabled,
      (state) =>
        state.engine?.backgroundState?.MultichainAssetsRatesController
          ?.conversionRates ?? {},
      (state) =>
        state.engine?.backgroundState?.AssetsController?.assetsPrice ?? {},
    ],
    (
      isAssetsUnifyStateEnabled: boolean,
      conversionRates: MultichainAssetsRatesControllerState['conversionRates'],
      assetsPrice: AssetsControllerState['assetsPrice'],
    ): MultichainAssetsRatesControllerState['conversionRates'] => {
      if (!isAssetsUnifyStateEnabled || isEmptyRecord(assetsPrice)) {
        return conversionRates;
      }

      const result: MultichainAssetsRatesControllerState['conversionRates'] = {
        ...conversionRates,
      };

      for (const [assetId, assetPrice] of Object.entries(assetsPrice) as [
        CaipAssetType,
        FungibleAssetPrice, // TODO: A type discriminator to AssetPrice is needed to be added to avoid this cast, but it is safe for now
      ][]) {
        const assetType = parseCaipAssetType(assetId);
        if (assetType.chain.namespace === KnownCaipNamespace.Eip155) {
          continue;
        }

        result[assetId] = {
          rate: `${assetPrice.price}`,
          conversionTime: assetPrice.lastUpdated,
          expirationTime: undefined,
          marketData: {
            fungible: true,
            allTimeHigh: `${assetPrice.allTimeHigh}`,
            allTimeLow: `${assetPrice.allTimeLow}`,
            circulatingSupply: `${assetPrice.circulatingSupply}`,
            marketCap: `${assetPrice.marketCap}`,
            totalVolume: `${assetPrice.totalVolume}`,
            pricePercentChange: {
              PT1H: assetPrice.pricePercentChange1h as number,
              P1D: assetPrice.pricePercentChange1d as number,
              P7D: assetPrice.pricePercentChange7d as number,
              P14D: assetPrice.pricePercentChange14d as number,
              P30D: assetPrice.pricePercentChange30d as number,
              P200D: assetPrice.pricePercentChange200d as number,
              P1Y: assetPrice.pricePercentChange1y as number,
            },
          },
        };
      }

      return result;
    },
  );

function parseBalanceWithDecimals(
  balanceString: string,
  decimals: number,
): Hex {
  const [integerPart, fractionalPart = ''] = balanceString.split('.');

  if (decimals === 0) {
    return bigIntToHex(BigInt(integerPart));
  }

  if (fractionalPart.length >= decimals) {
    return bigIntToHex(
      BigInt(`${integerPart}${fractionalPart.slice(0, decimals)}`),
    );
  }

  return bigIntToHex(
    BigInt(
      `${integerPart}${fractionalPart}${'0'.repeat(
        decimals - fractionalPart.length,
      )}`,
    ),
  );
}
