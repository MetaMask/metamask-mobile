// ============================================================================
// FIXTURES + RUNNER (frozen). Deterministic, seeded PRNG — no Math.random.
// Shapes mirror real AssetsController state slices: CAIP-19 asset ids with
// mixed-case contract addresses, decimal-string amounts, fungible prices.
// ============================================================================

function mulberry32(seed) {
  var a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

var HEXCHARS = '0123456789abcdef';
function fakeAddress(rand, mixedCase) {
  var s = '';
  for (var i = 0; i < 40; i++) {
    var c = HEXCHARS[Math.floor(rand() * 16)];
    if (mixedCase && rand() < 0.5) { c = c.toUpperCase(); }
    s += c;
  }
  return '0x' + s;
}

var EVM_CHAIN_REFS = ['1', '137', '56', '10', '8453', '42161', '43114', '84532', '11155111', '560048', '4217', '146'];
var STAKED_IDS = [
  'eip155:1/erc20:0x4FEF9D741011476750A243aC70b9789a63dd47Df',
  'eip155:560048/erc20:0x4FEF9D741011476750A243aC70b9789a63dd47Df',
];

function buildState(scale) {
  var rand = mulberry32(20261104);
  var assetsInfo = {};
  var assetsPrice = {};
  var assetsBalance = {};
  var customAssets = {};
  var assetPreferences = {};
  var accounts = {};

  // --- accounts ---
  var evmAccounts = Math.round(40 * scale) || 1;
  var erc4337Accounts = Math.round(8 * scale);
  var solAccounts = Math.round(6 * scale);
  var tronAccounts = Math.round(3 * scale);
  var btcAccounts = Math.round(2 * scale);
  var accountIdx = 0;
  function addAccount(type) {
    var id = 'account-' + accountIdx++;
    accounts[id] = {
      type: type,
      address: type.indexOf('eip155:') === 0
        ? fakeAddress(rand, false)
        : type.indexOf('solana:') === 0
          ? 'sol-address-' + accountIdx
          : 'other-address-' + accountIdx,
      id: id,
    };
    return id;
  }
  var evmIds = [];
  var nonEvmIds = [];
  var i;
  for (i = 0; i < evmAccounts; i++) evmIds.push(addAccount('eip155:eoa'));
  for (i = 0; i < erc4337Accounts; i++) evmIds.push(addAccount('eip155:erc4337'));
  for (i = 0; i < solAccounts; i++) nonEvmIds.push(addAccount('solana:mainnet'));
  for (i = 0; i < tronAccounts; i++) nonEvmIds.push(addAccount('tron:mainnet'));
  for (i = 0; i < btcAccounts; i++) nonEvmIds.push(addAccount('bip122:000000000019d6689c085ae165831e93'));

  // --- assets ---
  var evmAssetIds = [];
  var nonEvmAssetIds = [];
  var tokensPerChain = Math.round(35 * scale) || 1;
  for (i = 0; i < EVM_CHAIN_REFS.length; i++) {
    var ref = EVM_CHAIN_REFS[i];
    var nativeId = 'eip155:' + ref + '/slip44:60';
    assetsInfo[nativeId] = {
      type: 'native',
      decimals: 18,
      symbol: ref === '1' ? 'ETH' : 'N' + ref,
      name: 'Native ' + ref,
      image: 'https://img/' + ref + '.png',
    };
    evmAssetIds.push(nativeId);
    for (var t = 0; t < tokensPerChain; t++) {
      var assetId = 'eip155:' + ref + '/erc20:' + fakeAddress(rand, t % 3 === 0);
      assetsInfo[assetId] = {
        type: 'erc20',
        decimals: t % 3 === 0 ? 6 : 18,
        symbol: 'T' + ref + '_' + t,
        name: 'Token ' + ref + '/' + t,
        image: 'https://img/' + ref + '/' + t + '.png',
      };
      evmAssetIds.push(assetId);
    }
  }
  // staked vault tokens, mixed-case + lowercase variants of the same address
  for (i = 0; i < STAKED_IDS.length; i++) {
    assetsInfo[STAKED_IDS[i]] = {
      type: 'erc20',
      decimals: 18,
      symbol: 'STAKED' + i,
      name: 'Staked Vault ' + i,
      image: '',
    };
    evmAssetIds.push(STAKED_IDS[i]);
    var lowerId = STAKED_IDS[i].toLowerCase();
    assetsInfo[lowerId] = assetsInfo[STAKED_IDS[i]];
    evmAssetIds.push(lowerId);
  }
  // non-EVM assets (solana / tron / btc)
  for (i = 0; i < Math.round(24 * scale) + 1; i++) {
    var solId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvd/token:mint' + i;
    assetsInfo[solId] = {
      type: 'spl',
      decimals: 9,
      symbol: 'SOL' + i,
      name: 'Sol Token ' + i,
      image: '',
    };
    nonEvmAssetIds.push(solId);
  }
  for (i = 0; i < Math.round(6 * scale) + 1; i++) {
    var tronId = 'tron:728126428/trc20:TR' + i;
    assetsInfo[tronId] = {
      type: 'trc20',
      decimals: 6,
      symbol: 'TRX' + i,
      name: 'Tron Token ' + i,
      image: '',
    };
    nonEvmAssetIds.push(tronId);
  }
  var btcId = 'bip122:000000000019d6689c085ae165831e93/slip44:0';
  assetsInfo[btcId] = { type: 'native', decimals: 8, symbol: 'BTC', name: 'Bitcoin', image: '' };
  nonEvmAssetIds.push(btcId);

  // --- prices (for a majority of assets; a few 'spot' entries to exercise skips) ---
  var allIds = evmAssetIds.concat(nonEvmAssetIds);
  for (i = 0; i < allIds.length; i++) {
    if (i % 7 === 3) { continue; } // some assets have no price
    assetsPrice[allIds[i]] = {
      assetPriceType: i % 41 === 0 ? 'spot' : 'fungible',
      price: 0.25 + (i % 97) / 31,
      usdPrice: 1 + (i % 13) / 7,
      lastUpdated: 1730000000000 + i * 1000,
      id: 'price-' + i,
      marketCap: 1000 + i,
      allTimeHigh: 2000 + i,
      allTimeLow: 5 + i / 10,
      totalVolume: 300 + i,
      high1d: 1.5 + i / 100,
      low1d: 0.5 + i / 200,
      circulatingSupply: 1000000 + i,
      dilutedMarketCap: 2000000 + i,
      marketCapPercentChange1d: (i % 5) - 2,
      priceChange1d: (i % 7) - 3,
      pricePercentChange1h: (i % 3) - 1,
      pricePercentChange1d: (i % 9) - 4,
      pricePercentChange7d: (i % 11) - 5,
      pricePercentChange14d: (i % 13) - 6,
      pricePercentChange30d: (i % 17) - 8,
      pricePercentChange200d: (i % 19) - 9,
      pricePercentChange1y: (i % 23) - 11,
    };
  }

  // --- balances ---
  var AMOUNTS = ['0', '0.0000001', '123.456789012345678901', '999999999999999999999999', '42', '0.5', '1234567.891'];
  for (i = 0; i < evmIds.length; i++) {
    var bal = {};
    var n = 8 + Math.floor(rand() * (28 * scale + 4));
    for (var b = 0; b < n; b++) {
      var aid = evmAssetIds[Math.floor(rand() * evmAssetIds.length)];
      bal[aid] = { amount: AMOUNTS[Math.floor(rand() * AMOUNTS.length)] };
    }
    assetsBalance[evmIds[i]] = bal;
  }
  for (i = 0; i < nonEvmIds.length; i++) {
    var nbal = {};
    for (b = 0; b < 5; b++) {
      nbal[nonEvmAssetIds[Math.floor(rand() * nonEvmAssetIds.length)]] = {
        amount: AMOUNTS[Math.floor(rand() * AMOUNTS.length)],
      };
    }
    assetsBalance[nonEvmIds[i]] = nbal;
  }

  // --- custom assets (overlap with assetsBalance keys + extras) ---
  for (i = 0; i < evmIds.length; i += 3) {
    var cust = [];
    var keys = Object.keys(assetsBalance[evmIds[i]]);
    for (b = 0; b < keys.length && b < 4; b++) cust.push(keys[b]);
    var extra = evmAssetIds[Math.floor(rand() * evmAssetIds.length)];
    cust.push(extra);
    customAssets[evmIds[i]] = cust;
  }
  for (i = 0; i < nonEvmIds.length; i += 2) {
    var cust2 = [nonEvmAssetIds[i % nonEvmAssetIds.length]];
    customAssets[nonEvmIds[i]] = cust2;
  }

  // --- asset preferences (hidden/visible, incl. non-EVM and staked ids) ---
  for (i = 0; i < allIds.length; i += 2) {
    assetPreferences[allIds[i]] = { hidden: i % 6 === 1 };
  }
  assetPreferences[STAKED_IDS[0]] = { hidden: true };

  // --- network configurations (some chains missing -> 'NATIVE' default) ---
  var networkConfigurationsByChainId = {};
  for (i = 0; i < EVM_CHAIN_REFS.length; i++) {
    if (i % 5 === 4) { continue; }
    networkConfigurationsByChainId['0x' + BigInt(EVM_CHAIN_REFS[i]).toString(16)] = {
      nativeCurrency: 'NC' + i,
    };
  }

  return {
    engine: {
      backgroundState: {
        AssetsController: {
          assetsBalance: assetsBalance,
          assetsInfo: assetsInfo,
          customAssets: customAssets,
          assetPreferences: assetPreferences,
          assetsPrice: assetsPrice,
          selectedCurrency: 'usd',
        },
        AccountsController: { internalAccounts: { accounts: accounts } },
        NetworkController: { networkConfigurationsByChainId: networkConfigurationsByChainId },
      },
    },
  };
}

function buildEmptyState() {
  return {
    engine: {
      backgroundState: {
        AssetsController: {
          assetsBalance: {},
          assetsInfo: {},
          customAssets: {},
          assetPreferences: {},
          assetsPrice: {},
          selectedCurrency: undefined,
        },
        AccountsController: { internalAccounts: { accounts: {} } },
        NetworkController: { networkConfigurationsByChainId: {} },
      },
    },
  };
}

var SELECTOR_NAMES = [__SELECTORS__];

function runSuite(selectors, state) {
  var out = {};
  for (var i = 0; i < SELECTOR_NAMES.length; i++) {
    out[SELECTOR_NAMES[i]] = selectors[SELECTOR_NAMES[i]](state);
  }
  return out;
}

function stableStringify(value) {
  // Insertion-order stringify with array handling; enough for output comparison.
  return JSON.stringify(value);
}
