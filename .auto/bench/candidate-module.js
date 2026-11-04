// Bounded value-keyed memo for decimalToPrefixedHex: pure map of the chain
// reference string to its hex chain id; the same few chain references are
// re-derived for every asset on every state change.
const hexChainIdCache = new Map();
const HEX_CHAIN_CACHE_LIMIT = 512;
function decimalToPrefixedHexCached(value) {
    const cached = hexChainIdCache.get(value);
    if (cached !== undefined) {
        return cached;
    }
    const converted = decimalToPrefixedHex(value);
    if (hexChainIdCache.size >= HEX_CHAIN_CACHE_LIMIT) {
        hexChainIdCache.clear();
    }
    hexChainIdCache.set(value, converted);
    return converted;
}

// Bounded value-keyed memo for parseCaipAssetType: it is pure (regex parse of
// the raw id) and every selector re-parses the same recurring asset ids on
// every state change. Invalid ids are not cached (parse throws each time,
// matching uncached behavior). Mirrors the value-keyed memoization
// controller-utils already applies to toChecksumHexAddress.
const parseCaipAssetTypeCache = new Map();
const PARSE_CACHE_LIMIT = 8192;
function parseCaipAssetTypeCached(caipAssetType) {
    const cached = parseCaipAssetTypeCache.get(caipAssetType);
    if (cached !== undefined) {
        return cached;
    }
    const parsed = parseCaipAssetType(caipAssetType);
    if (parseCaipAssetTypeCache.size >= PARSE_CACHE_LIMIT) {
        parseCaipAssetTypeCache.clear();
    }
    parseCaipAssetTypeCache.set(caipAssetType, parsed);
    return parsed;
}

// CAIP-19 asset identifiers (with checksummed addresses) for the pooled-staking
// vault token that should never surface as regular ERC-20 tokens in the wallet
// token list or balance maps. Staking is only supported on Ethereum mainnet
// (eip155:1) and the Hoodi testnet (eip155:560048), where the vault token shares
// the same address. Scoping by CAIP-19 keeps the filter chain-aware so an
// identically-addressed token on an unsupported chain is left untouched.
const STAKED_TOKEN_ASSET_IDS_TO_FILTER = new Set([
    'eip155:1/erc20:0x4FEF9D741011476750A243aC70b9789a63dd47Df',
    'eip155:560048/erc20:0x4FEF9D741011476750A243aC70b9789a63dd47Df',
]);
// AssetIds may carry the contract address in any case, so normalize the asset
// reference to its checksummed form before matching against the filter set.
// Fast path: the filter set only contains eip155:1/eip155:560048 erc20 ids, so
// a raw-id prefix check skips the parse/checksum/template work for the common
// (non-staking) case. Matching ids still go through the exact check.
const STAKED_ID_PREFIXES = ['eip155:1/erc20:', 'eip155:560048/erc20:'];
const isStakedTokenAssetId = (assetId) => {
    if (!assetId.startsWith(STAKED_ID_PREFIXES[0]) &&
        !assetId.startsWith(STAKED_ID_PREFIXES[1])) {
        return false;
    }
    const { chainId, assetNamespace, assetReference } = parseCaipAssetTypeCached(assetId);
    return STAKED_TOKEN_ASSET_IDS_TO_FILTER.has(`${chainId}/${assetNamespace}:${toChecksumHexAddress(assetReference)}`);
};
// ChainId (hex) -> AccountAddress (hex checksummed) -> Balance (hex)
const getAccountTrackerControllerAccountsByChainId = makeDirect([
    (state) => state.engine?.backgroundState?.AssetsController?.assetsBalance ?? {},
    (state) => state.engine?.backgroundState?.AssetsController?.assetsInfo ?? {},
    (state) => state.engine?.backgroundState?.AccountsController?.internalAccounts
        ?.accounts ?? {},
], (assetsBalance, assetsInfo, internalAccountsById) => {
    var _a;
    const result = {};
    for (const [accountId, accountBalances] of Object.entries(assetsBalance)) {
        const internalAccount = internalAccountsById[accountId];
        if (!internalAccount || !isEvmAccountType(internalAccount.type)) {
            continue;
        }
        const checksummedAddress = toChecksumHexAddress(internalAccount.address);
        for (const [assetId, balanceData] of Object.entries(accountBalances)) {
            const metadata = assetsInfo[assetId];
            const assetType = parseCaipAssetTypeCached(assetId);
            if (assetType.chain.namespace !== KnownCaipNamespace.Eip155) {
                continue;
            }
            const hexChainId = decimalToPrefixedHexCached(assetType.chain.reference);
            const amount = balanceData?.amount ?? '0';
            if (metadata?.type === 'native') {
                result[hexChainId] ?? (result[hexChainId] = {});
                result[hexChainId][checksummedAddress] = {
                    // Spread preserves stakedBalance if it was already set by a
                    // staked-token entry processed earlier in this loop.
                    ...result[hexChainId][checksummedAddress],
                    // TODO: Use raw value from state when available
                    balance: parseBalanceWithDecimals(amount, metadata.decimals),
                };
            }
            else if (metadata && isStakedTokenAssetId(assetId)) {
                // Use the ERC-20 balance of the pooled-staking vault token as the
                // stakedBalance for this chain.  The token is filtered from the
                // regular token list (see STAKED_TOKEN_ASSET_IDS_TO_FILTER) and
                // surfaced here so it appears in the Staked Ethereum section on
                // Token Details instead.
                result[hexChainId] ?? (result[hexChainId] = {});
                (_a = result[hexChainId])[checksummedAddress] ?? (_a[checksummedAddress] = {
                    balance: '0x0',
                });
                result[hexChainId][checksummedAddress].stakedBalance =
                    parseBalanceWithDecimals(amount, metadata.decimals);
            }
        }
    }
    return result;
});
// ChainId (hex) -> AccountAddress (hex lowercase) -> Array of Tokens
const getTokensControllerAllTokens = makeDirect([
    (state) => state.engine?.backgroundState?.AssetsController?.assetsInfo ?? {},
    (state) => state.engine?.backgroundState?.AssetsController?.assetsBalance ?? {},
    (state) => state.engine?.backgroundState?.AssetsController?.customAssets ?? {},
    (state) => state.engine?.backgroundState?.AccountsController?.internalAccounts
        ?.accounts ?? {},
], (assetsInfo, assetsBalance, customAssets, internalAccountsById) => {
    var _a, _b;
    const result = {};
    // Merge assetsBalance and customAssets: accountId -> assetId[]
    // (single pass; preserves first-occurrence order of the previous
    // fromEntries/Set version without the intermediate allocations)
    const allAssets = {};
    for (const accountId of Object.keys(assetsBalance)) {
        allAssets[accountId] = Object.keys(assetsBalance[accountId]);
    }
    for (const accountId of Object.keys(customAssets)) {
        const seen = new Set(allAssets[accountId] ?? (allAssets[accountId] = []));
        const fromCustom = customAssets[accountId];
        for (let i = 0; i < fromCustom.length; i++) {
            const assetId = fromCustom[i];
            if (!seen.has(assetId)) {
                seen.add(assetId);
                allAssets[accountId].push(assetId);
            }
        }
    }
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
            const assetType = parseCaipAssetTypeCached(assetId);
            if (assetType.chain.namespace !== KnownCaipNamespace.Eip155) {
                continue;
            }
            const hexChainId = decimalToPrefixedHexCached(assetType.chain.reference);
            const assetAddress = toChecksumHexAddress(assetType.assetReference);
            if (isStakedTokenAssetId(assetId)) {
                continue;
            }
            const token = {
                address: assetAddress,
                symbol: metadata.symbol,
                decimals: metadata.decimals,
                name: metadata.name,
                image: metadata.image,
            };
            result[hexChainId] ?? (result[hexChainId] = {});
            (_a = result[hexChainId])[_b = internalAccount.address] ?? (_a[_b] = []);
            result[hexChainId][internalAccount.address].push(token);
        }
    }
    return result;
});
// ChainId (hex) -> AccountAddress (hex lowercase) -> Array of TokenAddress (hex lowercase)
const getTokensControllerAllIgnoredTokens = makeDirect([
    (state) => state.engine?.backgroundState?.AssetsController?.assetPreferences ?? {},
    (state) => state.engine?.backgroundState?.AccountsController?.internalAccounts
        ?.accounts ?? {},
], (assetPreferences, internalAccountsById) => {
    var _a, _b;
    const result = {};
    for (const [assetId, { hidden }] of Object.entries(assetPreferences)) {
        if (!hidden) {
            continue;
        }
        const assetType = parseCaipAssetTypeCached(assetId);
        if (assetType.chain.namespace !== KnownCaipNamespace.Eip155) {
            continue;
        }
        const hexChainId = decimalToPrefixedHexCached(assetType.chain.reference);
        // The asset is hidden for all EVM accounts
        for (const internalAccount of Object.values(internalAccountsById)) {
            if (!isEvmAccountType(internalAccount.type)) {
                continue;
            }
            result[hexChainId] ?? (result[hexChainId] = {});
            (_a = result[hexChainId])[_b = internalAccount.address] ?? (_a[_b] = []);
            result[hexChainId][internalAccount.address].push(assetType.assetReference);
        }
    }
    return result;
});
// AcountAddress (hex lowercase) -> ChainId (hex) -> TokenAddress (hex checksummed) -> Balance (hex)
const getTokenBalancesControllerTokenBalances = makeDirect([
    (state) => state.engine?.backgroundState?.AssetsController?.assetsInfo ?? {},
    (state) => state.engine?.backgroundState?.AssetsController?.assetsBalance ?? {},
    (state) => state.engine?.backgroundState?.AssetsController?.customAssets ?? {},
    (state) => state.engine?.backgroundState?.AccountsController?.internalAccounts
        ?.accounts ?? {},
], (assetsInfo, assetsBalance, customAssets, internalAccountsById) => {
    var _a, _b;
    const result = {};
    for (const [accountId, chainIdBalances] of Object.entries(assetsBalance)) {
        const internalAccount = internalAccountsById[accountId];
        if (!internalAccount || !isEvmAccountType(internalAccount.type)) {
            continue;
        }
        const accountAddress = internalAccount.address;
        result[accountAddress] ?? (result[accountAddress] = {});
        for (const [assetId, assetBalance] of Object.entries(chainIdBalances)) {
            const metadata = assetsInfo[assetId];
            if (!metadata) {
                continue;
            }
            const assetType = parseCaipAssetTypeCached(assetId);
            // TokenBalancesController is EVM-only; skip non-eip155 assets (e.g.
            // Solana) that can appear under the same account in unified state.
            // Otherwise `decimalToPrefixedHex` on a non-decimal reference yields
            // invalid keys such as `0xNaN`.
            if (assetType.chain.namespace !== KnownCaipNamespace.Eip155) {
                continue;
            }
            const hexChainId = decimalToPrefixedHexCached(assetType.chain.reference);
            const assetAddress = toChecksumHexAddress(metadata.type === 'native'
                ? // TokenBalancesController always uses zero address for native tokens
                    '0x0000000000000000000000000000000000000000'
                : assetType.assetReference);
            if (isStakedTokenAssetId(assetId)) {
                continue;
            }
            (_a = result[accountAddress])[hexChainId] ?? (_a[hexChainId] = {});
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
        const accountAddress = internalAccount.address;
        result[accountAddress] ?? (result[accountAddress] = {});
        const accountBalances = assetsBalance[accountId] ?? {};
        for (const assetId of assetIds) {
            if (accountBalances[assetId]) {
                continue;
            }
            const metadata = assetsInfo[assetId];
            if (!metadata || metadata.type === 'native') {
                continue;
            }
            const assetType = parseCaipAssetTypeCached(assetId);
            if (assetType.chain.namespace !== KnownCaipNamespace.Eip155) {
                continue;
            }
            const hexChainId = decimalToPrefixedHexCached(assetType.chain.reference);
            const assetAddress = toChecksumHexAddress(assetType.assetReference);
            if (isStakedTokenAssetId(assetId)) {
                continue;
            }
            if (!result[accountAddress]?.[hexChainId]?.[assetAddress]) {
                (_b = result[accountAddress])[hexChainId] ?? (_b[hexChainId] = {});
                result[accountAddress][hexChainId][assetAddress] =
                    parseBalanceWithDecimals('0', metadata.decimals);
            }
        }
    }
    return result;
});
// AccountId -> Array of AssetIds
const getMultiChainAssetsControllerAccountsAssets = makeDirect([
    (state) => state.engine?.backgroundState?.AssetsController?.assetsBalance ?? {},
    (state) => state.engine?.backgroundState?.AssetsController?.customAssets ?? {},
    (state) => state.engine?.backgroundState?.AccountsController?.internalAccounts
        ?.accounts ?? {},
], (assetsBalance, customAssets, internalAccountsById) => {
    const result = {};
    // Merge assetsBalance and customAssets: accountId -> assetId[]
    // (single pass; preserves first-occurrence order of the previous
    // fromEntries/Set version without the intermediate allocations)
    const allAssets = {};
    for (const accountId of Object.keys(assetsBalance)) {
        allAssets[accountId] = Object.keys(assetsBalance[accountId]);
    }
    for (const accountId of Object.keys(customAssets)) {
        const seen = new Set(allAssets[accountId] ?? (allAssets[accountId] = []));
        const fromCustom = customAssets[accountId];
        for (let i = 0; i < fromCustom.length; i++) {
            const assetId = fromCustom[i];
            if (!seen.has(assetId)) {
                seen.add(assetId);
                allAssets[accountId].push(assetId);
            }
        }
    }
    for (const [accountId, assetIds] of Object.entries(allAssets)) {
        const internalAccount = internalAccountsById[accountId];
        if (!internalAccount || isEvmAccountType(internalAccount.type)) {
            continue;
        }
        result[accountId] = [];
        for (const assetId of assetIds) {
            const assetType = parseCaipAssetTypeCached(assetId);
            if (assetType.chain.namespace === KnownCaipNamespace.Eip155) {
                continue;
            }
            result[accountId].push(assetId);
        }
    }
    return result;
});
// TODO There are issues with the new image url not matching the one in assetsMetadata iconUrl
// AssetId -> AssetMetadata
const getMultiChainAssetsControllerAssetsMetadata = makeDirect([
    (state) => state.engine?.backgroundState?.AssetsController?.assetsInfo ?? {},
], (assetsInfo) => {
    const result = {};
    for (const [assetId, metadata] of Object.entries(assetsInfo)) {
        const assetType = parseCaipAssetTypeCached(assetId);
        if (assetType.chain.namespace === KnownCaipNamespace.Eip155) {
            continue;
        }
        result[assetId] = {
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
});
// AccountId -> Array of AssetIds
const getMultiChainAssetsControllerAllIgnoredAssets = makeDirect([
    (state) => state.engine?.backgroundState?.AssetsController?.assetPreferences ?? {},
    (state) => state.engine?.backgroundState?.AccountsController?.internalAccounts
        ?.accounts ?? {},
], (assetPreferences, internalAccountsById) => {
    const result = {};
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
            const assetType = parseCaipAssetTypeCached(assetId);
            if (assetType.chain.namespace === KnownCaipNamespace.Eip155) {
                continue;
            }
            result[accountId].push(assetId);
        }
    }
    return result;
});
// AccountId -> AssetId -> Balance (amount + unit)
const getMultiChainBalancesControllerBalances = makeDirect([
    (state) => state.engine?.backgroundState?.AssetsController?.assetsBalance ?? {},
    (state) => state.engine?.backgroundState?.AssetsController?.assetsInfo ?? {},
    (state) => state.engine?.backgroundState?.AccountsController?.internalAccounts
        ?.accounts ?? {},
], (assetsBalance, assetsInfo, internalAccountsById) => {
    const result = {};
    for (const [accountId, chainIdBalances] of Object.entries(assetsBalance)) {
        const internalAccount = internalAccountsById[accountId];
        if (!internalAccount || isEvmAccountType(internalAccount.type)) {
            continue;
        }
        result[accountId] = {};
        for (const [assetId, balance] of Object.entries(chainIdBalances)) {
            const assetType = parseCaipAssetTypeCached(assetId);
            const metadata = assetsInfo[assetId];
            if (!metadata ||
                assetType.chain.namespace === KnownCaipNamespace.Eip155) {
                continue;
            }
            result[accountId][assetId] = {
                amount: balance.amount,
                unit: metadata.symbol,
            };
        }
    }
    return result;
});
const getCurrencyRateControllerCurrentCurrency = makeDirect([
    (state) => state.engine?.backgroundState?.AssetsController?.selectedCurrency,
], (selectedCurrency) => selectedCurrency);
// Native Symbol -> Rates (conversionRate, usdConversionRate, conversionDate)
const getCurrencyRateControllerCurrencyRates = makeDirect([
    (state) => state.engine?.backgroundState?.AssetsController?.assetsInfo ?? {},
    (state) => state.engine?.backgroundState?.AssetsController?.assetsPrice ?? {},
], (assetsInfo, assetsPrice) => {
    const result = {};
    // Only native EVM assets with fungible pricing can insert into the result,
    // so collect those first (unsorted) and sort just them. The comparator is
    // the same localeCompare as before; a stable subset sort preserves the
    // relative order the full sorted iteration used to produce.
    const nativeEntries = [];
    const infoIds = Object.keys(assetsInfo);
    for (let i = 0; i < infoIds.length; i++) {
        const assetId = infoIds[i];
        const metadata = assetsInfo[assetId];
        const assetType = parseCaipAssetTypeCached(assetId);
        if (metadata.type === 'native' &&
            assetType.chain.namespace === KnownCaipNamespace.Eip155) {
            nativeEntries.push([assetId, metadata]);
        }
    }
    nativeEntries.sort((a, b) => a[0].localeCompare(b[0]));
    for (let i = 0; i < nativeEntries.length; i++) {
        const assetId = nativeEntries[i][0];
        const metadata = nativeEntries[i][1];
        // Skip if we already have an entry for this symbol
        if (result[metadata.symbol]) {
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
    return augmentTempoCurrencyRates(result, assetsPrice);
});
// ChainId (hex) -> TokenAddress (hex checksummed) -> MarketData
const getTokenRatesControllerMarketData = makeDirect([
    (state) => state.engine?.backgroundState?.AssetsController?.assetsPrice ?? {},
    (state) => state.engine?.backgroundState?.AssetsController?.assetsInfo ?? {},
    getCurrencyRateControllerCurrencyRates,
    (state) => state.engine?.backgroundState?.NetworkController
        ?.networkConfigurationsByChainId ?? {},
], (assetsPrice, assetsInfo, currencyRates, networkConfigurationsByChainId) => {
    const result = {};
    const convertToNativeCurrency = (amount, rate) => amount === undefined ? undefined : amount / rate;
    const priceIds = Object.keys(assetsPrice);
    for (let pi = 0; pi < priceIds.length; pi++) {
        const assetId = priceIds[pi];
        const price = assetsPrice[assetId];
        const assetType = parseCaipAssetTypeCached(assetId);
        if (assetType.chain.namespace !== KnownCaipNamespace.Eip155) {
            continue;
        }
        const metadata = assetsInfo[assetId];
        if (!metadata) {
            continue;
        }
        const hexChainId = decimalToPrefixedHexCached(assetType.chain.reference);
        const nativeAssetSymbol = networkConfigurationsByChainId[hexChainId]?.nativeCurrency ?? 'NATIVE';
        const assetAddress = toChecksumHexAddress(metadata.type === 'native'
            ? getNativeTokenAddress(hexChainId)
            : assetType.assetReference);
        const nativeCurrencyRate = currencyRates[nativeAssetSymbol]?.conversionRate;
        if (!nativeCurrencyRate) {
            continue;
        }
        result[hexChainId] ?? (result[hexChainId] = {});
        result[hexChainId][assetAddress] = {
            id: price.id,
            price: convertToNativeCurrency(price.price, nativeCurrencyRate),
            marketCap: convertToNativeCurrency(price.marketCap, nativeCurrencyRate),
            allTimeHigh: convertToNativeCurrency(price.allTimeHigh, nativeCurrencyRate),
            allTimeLow: convertToNativeCurrency(price.allTimeLow, nativeCurrencyRate),
            totalVolume: convertToNativeCurrency(price.totalVolume, nativeCurrencyRate),
            high1d: convertToNativeCurrency(price.high1d, nativeCurrencyRate),
            low1d: convertToNativeCurrency(price.low1d, nativeCurrencyRate),
            circulatingSupply: price.circulatingSupply,
            dilutedMarketCap: convertToNativeCurrency(price.dilutedMarketCap, nativeCurrencyRate),
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
        };
    }
    return result;
});
const getMultichainAssetsRatesControllerConversionRates = makeDirect([
    (state) => state.engine?.backgroundState?.AssetsController?.assetsPrice ?? {},
], (assetsPrice) => {
    const result = {};
    for (const [assetId, assetPrice] of Object.entries(assetsPrice)) {
        const assetType = parseCaipAssetTypeCached(assetId);
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
                    PT1H: assetPrice.pricePercentChange1h,
                    P1D: assetPrice.pricePercentChange1d,
                    P7D: assetPrice.pricePercentChange7d,
                    P14D: assetPrice.pricePercentChange14d,
                    P30D: assetPrice.pricePercentChange30d,
                    P200D: assetPrice.pricePercentChange200d,
                    P1Y: assetPrice.pricePercentChange1y,
                },
            },
        };
    }
    return result;
});
function parseBalanceWithDecimals(balanceString, decimals) {
    const [integerPart, fractionalPart = ''] = balanceString.split('.');
    if (decimals === 0) {
        return bigIntToHex(BigInt(integerPart));
    }
    if (fractionalPart.length >= decimals) {
        return bigIntToHex(BigInt(`${integerPart}${fractionalPart.slice(0, decimals)}`));
    }
    return bigIntToHex(BigInt(`${integerPart}${fractionalPart}${'0'.repeat(decimals - fractionalPart.length)}`));
}
