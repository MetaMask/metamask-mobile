// ============================================================================
// INLINED DEPENDENCY COPIES (frozen — do not edit during experiments).
// Faithful copies of the exact implementations the production file runs on:
//   @metamask/utils (hex.js, caip-types.js, number.js, assert.js)
//   @metamask/controller-utils (toChecksumHexAddress, memoized)
//   app/util/number (addHexPrefix), app/util/conversions (decimalToPrefixedHex)
//   @metamask/keyring-api (isEvmAccountType)
//   @metamask/assets-controllers (getNativeTokenAddress)
//   app/enablement/assets/tempo (augmentTempoCurrencyRates, constants pre-resolved)
//   app/selectors/util (createDeepEqualSelector -> makeDirect: memoization is
//   intentionally dropped; the bench measures the recompute path, which is what
//   the profile flags — selectors re-run whenever any input slice changes.)
// Known substitutions (documented in .auto/prompt.md):
//   - keccak_256: compact validated copy (matches @noble/hashes on vectors)
//   - decimalToHex: BigInt path; production uses BigNumber. Identical for the
//     integer chain references EIP-155 always provides (the only inputs here).
// ============================================================================

// assert (@metamask/utils assert.js): class-free (pod hermes 0.14.1 has no
// class syntax); same observable behavior (Error with .code = 'ERR_ASSERTION').
function AssertionError(message) {
  var e = new Error(message);
  e.code = 'ERR_ASSERTION';
  e.name = 'AssertionError';
  return e;
}
function assert(value, message) {
  if (!value) {
    throw AssertionError(message);
  }
}

var HEX_REGEX = /^(?:0x)?[0-9a-f]+$/iu;
var STRICT_HEX_REGEX = /^0x[0-9a-f]+$/iu;
var HEX_CHECKSUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/u;
function isHexString(value) { return typeof value === 'string' && HEX_REGEX.test(value); }
function isStrictHexString(value) { return typeof value === 'string' && STRICT_HEX_REGEX.test(value); }
function isHexChecksumAddress(value) { return typeof value === 'string' && HEX_CHECKSUM_ADDRESS_REGEX.test(value); }
function add0x(hexadecimal) {
  if (hexadecimal.startsWith('0x')) { return hexadecimal; }
  if (hexadecimal.startsWith('0X')) { return '0x' + hexadecimal.substring(2); }
  return '0x' + hexadecimal;
}
function remove0x(hexadecimal) {
  if (hexadecimal.startsWith('0x') || hexadecimal.startsWith('0X')) { return hexadecimal.substring(2); }
  return hexadecimal;
}

// --- keccak_256 (legacy Keccak padding 0x01); validated against @noble/hashes ---
var KECCAK_RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];
var KECCAK_ROT = [
  [0, 36, 3, 41, 18],
  [1, 44, 10, 45, 2],
  [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56],
  [27, 20, 39, 8, 14],
];
var MASK64 = 0xffffffffffffffffn;
function rotl64(x, n) {
  var b = BigInt(n);
  return ((x << b) | (x >> (64n - b))) & MASK64;
}
function keccakF1600(lanes) {
  var c = new Array(5);
  var b = Array.from({ length: 5 }, function () { return new Array(5).fill(0n); });
  for (var round = 0; round < 24; round++) {
    for (var x = 0; x < 5; x++) {
      c[x] = lanes[x][0] ^ lanes[x][1] ^ lanes[x][2] ^ lanes[x][3] ^ lanes[x][4];
    }
    for (x = 0; x < 5; x++) {
      var d = c[(x + 4) % 5] ^ rotl64(c[(x + 1) % 5], 1);
      for (var y = 0; y < 5; y++) {
        lanes[x][y] = (lanes[x][y] ^ d) & MASK64;
      }
    }
    for (x = 0; x < 5; x++) {
      for (y = 0; y < 5; y++) {
        b[y][(2 * x + 3 * y) % 5] = rotl64(lanes[x][y], KECCAK_ROT[x][y]);
      }
    }
    for (x = 0; x < 5; x++) {
      for (y = 0; y < 5; y++) {
        lanes[x][y] = (b[x][y] ^ ((~b[(x + 1) % 5][y] & MASK64) & b[(x + 2) % 5][y])) & MASK64;
      }
    }
    lanes[0][0] = (lanes[0][0] ^ KECCAK_RC[round]) & MASK64;
  }
}
function bytesToLanes(bytes, lanes) {
  for (var i = 0; i < 25; i++) {
    var v = 0n;
    for (var j = 7; j >= 0; j--) {
      v = (v << 8n) | BigInt(bytes[i * 8 + j]);
    }
    lanes[i % 5][(i / 5) | 0] = v;
  }
}
var __absorb = new Uint8Array(200);
var __outBuf = new Uint8Array(200);
function keccak_256(str) {
  var input = [];
  for (var i = 0; i < str.length; i++) input.push(str.charCodeAt(i) & 0xff);
  var rate = 136;
  var paddedLen = Math.ceil((input.length + 1) / rate) * rate;
  var block = new Uint8Array(paddedLen);
  block.set(input);
  block[input.length] = 0x01;
  block[paddedLen - 1] |= 0x80;
  var lanes = Array.from({ length: 5 }, function () { return new Array(5).fill(0n); });
  var blockLanes = Array.from({ length: 5 }, function () { return new Array(5).fill(0n); });
  for (var off = 0; off < paddedLen; off += rate) {
    for (i = 0; i < rate; i++) __absorb[i] = block[off + i];
    for (i = rate; i < 200; i++) __absorb[i] = 0;
    bytesToLanes(__absorb, blockLanes);
    for (var x = 0; x < 5; x++) {
      for (var y = 0; y < 5; y++) {
        lanes[x][y] = (lanes[x][y] ^ blockLanes[x][y]) & MASK64;
      }
    }
    keccakF1600(lanes);
  }
  var digest = new Uint8Array(32);
  for (i = 0; i < 25; i++) __outBuf[i * 8] = 0;
  for (i = 0; i < 25; i++) {
    var v = lanes[i % 5][(i / 5) | 0];
    for (var j = 0; j < 8; j++) {
      __outBuf[i * 8 + j] = Number(v & 0xffn);
      v >>= 8n;
    }
  }
  for (i = 0; i < 32; i++) digest[i] = __outBuf[i];
  return digest;
}

// --- memoize (lodash-equivalent: keyed on first argument) ---
function memoize(fn) {
  var cache = new Map();
  return function (arg) {
    if (cache.has(arg)) { return cache.get(arg); }
    var v = fn.call(this, arg);
    cache.set(arg, v);
    return v;
  };
}

// --- getChecksumAddressUnmemoized (@metamask/utils hex.js, verbatim) ---
function getChecksumAddressUnmemoized(hexAddress) {
  assert(isHexChecksumAddress(hexAddress), 'Invalid hex address.');
  var address = remove0x(hexAddress).toLowerCase();
  var hashBytes = keccak_256(address);
  var length = address.length;
  var result = new Array(length);
  for (var i = 0; i < length; i++) {
    var byteIndex = i >> 1;
    var nibbleIndex = i & 1;
    var byte = hashBytes[byteIndex];
    var nibble = nibbleIndex === 0 ? byte >> 4 : byte & 0x0f;
    result[i] = nibble >= 8 ? address[i].toUpperCase() : address[i];
  }
  return '0x' + result.join('');
}

// --- toChecksumHexAddress (@metamask/controller-utils util.js, verbatim) ---
function toChecksumHexAddressUnmemoized(address) {
  if (typeof address !== 'string') {
    return address;
  }
  var hexPrefixed = add0x(address);
  if (!isHexString(hexPrefixed)) {
    return hexPrefixed;
  }
  try {
    return getChecksumAddressUnmemoized(hexPrefixed);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid hex address.') {
      return hexPrefixed;
    }
    throw error;
  }
}
var toChecksumHexAddress = memoize(toChecksumHexAddressUnmemoized);

// --- CAIP-19 (@metamask/utils caip-types.js, verbatim) ---
var CAIP_ASSET_TYPE_REGEX = /^(?<chainId>(?<namespace>[-a-z0-9]{3,8}):(?<reference>[-_a-zA-Z0-9]{1,32}))\/(?<assetNamespace>[-a-z0-9]{3,8}):(?<assetReference>[-.%a-zA-Z0-9]{1,128})$/u;
function parseCaipAssetType(caipAssetType) {
  var match = CAIP_ASSET_TYPE_REGEX.exec(caipAssetType);
  if (!match || !match.groups) {
    throw new Error('Invalid CAIP asset type.');
  }
  return {
    assetNamespace: match.groups.assetNamespace,
    assetReference: match.groups.assetReference,
    chainId: match.groups.chainId,
    chain: {
      namespace: match.groups.namespace,
      reference: match.groups.reference,
    },
  };
}

var KnownCaipNamespace = { Eip155: 'eip155' };

// --- bigIntToHex (@metamask/utils number.js, verbatim) ---
var bigIntToHex = function (value) {
  assert(typeof value === 'bigint', 'Value must be a bigint.');
  assert(value >= 0, 'Value must be a non-negative bigint.');
  return add0x(value.toString(16));
};

// --- addHexPrefix (app/util/number/index.js, verbatim) ---
var __hexPrefixRegex = /^-?0x/u;
var addHexPrefix = function (str) {
  if (typeof str !== 'string' || str.match(__hexPrefixRegex)) {
    return str;
  }
  if (str.match(__hexPrefixRegex)) {
    return str.replace('0X', '0x');
  }
  if (str.startsWith('-')) {
    return str.replace('-', '-0x');
  }
  return '0x' + str;
};

// --- decimalToHex + decimalToPrefixedHex (app/util/conversions.js) ---
// Production: conversionUtil({fromNumericBase:'dec', toNumericBase:'hex'}) =
//   new BigNumber(String(n), 10).toString(16), then addHexPrefix.
// Chain references on EIP-155 are always integers, where BigInt is identical.
function decimalToHex(n) {
  return BigInt(String(n)).toString(16);
}
function decimalToPrefixedHex(decimal) {
  return addHexPrefix(decimalToHex(decimal));
}

// --- isEvmAccountType (@metamask/keyring-api, verbatim) ---
var EthAccountType = { Eoa: 'eip155:eoa', Erc4337: 'eip155:erc4337' };
function isEvmAccountType(type) {
  return type === EthAccountType.Eoa || type === EthAccountType.Erc4337;
}

// --- getNativeTokenAddress (@metamask/assets-controllers codefi-v2.js, verbatim) ---
var ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
var chainIdToNativeTokenAddress = {
  '0x89': '0x0000000000000000000000000000000000001010',
  '0x440': '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000',
  '0x1388': '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000',
};
var getNativeTokenAddress = function (chainId) {
  return chainIdToNativeTokenAddress[chainId] || ZERO_ADDRESS;
};

// --- augmentTempoCurrencyRates (app/enablement/assets/tempo.ts, verbatim logic;
//     the two formatChainIdToCaip() results and the TEMPO symbol are constants
//     pre-resolved at extraction time: 'eip155:4217', 'eip155:42431', 'USD') ---
function augmentTempoCurrencyRates(currencyRates, assetsPrice) {
  var tempoCurrencySymbol = 'USD';
  if (currencyRates[tempoCurrencySymbol]) {
    return currencyRates;
  }
  var tempoCaipChainIds = new Set(['eip155:4217', 'eip155:42431']);
  var latest;
  for (var _a = 0, _b = Object.entries(assetsPrice); _a < _b.length; _a++) {
    var entry = _b[_a];
    var assetId = entry[0];
    var price = entry[1];
    if (!tempoCaipChainIds.has(parseCaipAssetType(assetId).chainId)) {
      continue;
    }
    if (
      price.assetPriceType === 'fungible' &&
      Number.isFinite(price.price) &&
      price.price > 0 &&
      Number.isFinite(price.usdPrice) &&
      price.usdPrice > 0 &&
      (!latest || price.lastUpdated > latest.lastUpdated)
    ) {
      latest = price;
    }
  }
  if (!latest) {
    return currencyRates;
  }
  var result = {};
  var k;
  for (k in currencyRates) { result[k] = currencyRates[k]; }
  result[tempoCurrencySymbol] = {
    conversionDate: latest.lastUpdated / 1000,
    conversionRate: latest.price / latest.usdPrice,
    usdConversionRate: 1,
  };
  return result;
}

// --- makeDirect: reselect-free stand-in for createDeepEqualSelector ---
// (inputs are evaluated eagerly, then the combiner runs — the cache-miss path)
function makeDirect(inputs, combiner) {
  return function (state) {
    var vals = new Array(inputs.length);
    for (var i = 0; i < inputs.length; i++) {
      vals[i] = inputs[i](state);
    }
    return combiner.apply(null, vals);
  };
}
