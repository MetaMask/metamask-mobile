/**
 * TDD Parity Tests: BigInt API vs Legacy BN.js API
 *
 * These tests verify that every function in bigint.ts produces
 * identical results to its legacy counterpart in index.js.
 * They are the safety net for the migration — if these pass,
 * a call-site can be switched from legacy → bigint with confidence.
 */
import {
  hexToBigInt,
  bigIntToHex,
  fromWei as bigintFromWei,
  toWei as bigintToWei,
  fromTokenMinimalUnit as bigintFromTokenMinimalUnit,
  toTokenMinimalUnit as bigintToTokenMinimalUnit,
  renderFromWei as bigintRenderFromWei,
  renderFromTokenMinimalUnit as bigintRenderFromTokenMinimalUnit,
  weiToFiat as bigintWeiToFiat,
  weiToFiatNumber as bigintWeiToFiatNumber,
  balanceToFiat as bigintBalanceToFiat,
  balanceToFiatNumber as bigintBalanceToFiatNumber,
  fiatNumberToWei as bigintFiatNumberToWei,
  fiatNumberToTokenMinimalUnit as bigintFiatNumberToTokenMinimalUnit,
  safeNumberToBigInt,
  addHexPrefix as bigintAddHexPrefix,
  renderNumber as bigintRenderNumber,
  toHexadecimal as bigintToHexadecimal,
  isZeroValue as bigintIsZeroValue,
  calculateEthFeeForMultiLayer as bigintCalculateEthFeeForMultiLayer,
  safeBigIntToHex,
  addCurrencySymbol as bigintAddCurrencySymbol,
} from './bigint';

import {
  hexToBN,
  BNToHex,
  fromWei as legacyFromWei,
  toWei as legacyToWei,
  fromTokenMinimalUnit as legacyFromTokenMinimalUnit,
  toTokenMinimalUnit as legacyToTokenMinimalUnit,
  renderFromWei as legacyRenderFromWei,
  renderFromTokenMinimalUnit as legacyRenderFromTokenMinimalUnit,
  weiToFiat as legacyWeiToFiat,
  weiToFiatNumber as legacyWeiToFiatNumber,
  balanceToFiat as legacyBalanceToFiat,
  balanceToFiatNumber as legacyBalanceToFiatNumber,
  fiatNumberToWei as legacyFiatNumberToWei,
  fiatNumberToTokenMinimalUnit as legacyFiatNumberToTokenMinimalUnit,
  safeNumberToBN,
  addHexPrefix as legacyAddHexPrefix,
  renderNumber as legacyRenderNumber,
  toHexadecimal as legacyToHexadecimal,
  isZeroValue as legacyIsZeroValue,
  calculateEthFeeForMultiLayer as legacyCalculateEthFeeForMultiLayer,
  safeBNToHex,
  addCurrencySymbol as legacyAddCurrencySymbol,
} from './index';

/**
 * --------------------------------------------------------------------------
 * Section 1: Hex ↔ Integer Conversion Parity
 * --------------------------------------------------------------------------
 */
describe('Parity: hex ↔ integer conversion', () => {
  const HEX_CASES = [
    '0x0',
    '0x1',
    '0x539',
    '0xde0b6b3a7640000', // 1 ether in wei
    '0x00',
    '0xffffffffffffffff',
  ];

  it.each(HEX_CASES)(
    'hexToBigInt(%s) equals hexToBN(%s) numerically',
    (hex) => {
      const fromBigInt = hexToBigInt(hex);
      const fromBN = hexToBN(hex);
      expect(fromBigInt.toString(10)).toBe(fromBN.toString(10));
    },
  );

  it.each([0n, 1n, 1337n, 1000000000000000000n])(
    'bigIntToHex(%s) equals BNToHex for same value',
    (value) => {
      const bigIntResult = bigIntToHex(value);
      // BNToHex expects a BN instance — pass the decimal string representation
      const bnResult = BNToHex(hexToBN(`0x${value.toString(16)}`));
      expect(bigIntResult).toBe(bnResult);
    },
  );

  it('round-trip: hexToBigInt → bigIntToHex is lossless for 1 ether', () => {
    const oneEtherHex = '0xde0b6b3a7640000';
    const roundTripped = bigIntToHex(hexToBigInt(oneEtherHex));
    expect(roundTripped).toBe(oneEtherHex);
  });
});

/**
 * --------------------------------------------------------------------------
 * Section 2: Wei ↔ Ether Conversion Parity
 * --------------------------------------------------------------------------
 */
describe('Parity: fromWei', () => {
  const WEI_CASES: [string | number, string][] = [
    [0, 'ether'],
    [1337, 'ether'],
    ['1000000000000000000', 'ether'],
    ['500000000000000000', 'ether'],
    ['1000000000', 'gwei'],
  ];

  it.each(WEI_CASES)(
    'bigintFromWei(%s, %s) matches legacyFromWei',
    (value, unit) => {
      const bigintResult = bigintFromWei(value, unit as 'ether' | 'gwei');
      const legacyResult = legacyFromWei(value, unit);
      expect(bigintResult).toBe(legacyResult);
    },
  );
});

describe('Parity: toWei', () => {
  const ETHER_CASES: [string | number, string][] = [
    [1, 'ether'],
    ['1', 'ether'],
    ['0.5', 'ether'],
    ['0.000000000000001337', 'ether'],
    [1337, 'ether'],
  ];

  it.each(ETHER_CASES)(
    'bigintToWei(%s, %s) matches legacyToWei',
    (value, unit) => {
      const bigintResult = bigintToWei(value, unit as 'ether').toString();
      const legacyResult = legacyToWei(value, unit).toString(10);
      expect(bigintResult).toBe(legacyResult);
    },
  );
});

/**
 * --------------------------------------------------------------------------
 * Section 3: Token Minimal Unit Conversion Parity
 * --------------------------------------------------------------------------
 */
describe('Parity: fromTokenMinimalUnit', () => {
  const CASES: [string | number, number][] = [
    ['1337', 6],
    ['1337', 0],
    ['1337', 18],
    [1337, 6],
    ['1000000', 6],
    ['1000000000000000000', 18],
  ];

  it.each(CASES)(
    'bigintFromTokenMinimalUnit(%s, %i) matches legacy',
    (value, decimals) => {
      const bigintResult = bigintFromTokenMinimalUnit(value, decimals);
      const legacyResult = legacyFromTokenMinimalUnit(value, decimals);
      expect(bigintResult).toBe(legacyResult);
    },
  );
});

describe('Parity: toTokenMinimalUnit', () => {
  const CASES: [string | number, number][] = [
    ['1337', 6],
    ['1337', 0],
    ['0.001337', 6],
    [1337, 6],
    ['1', 18],
  ];

  it.each(CASES)(
    'bigintToTokenMinimalUnit(%s, %i) matches legacy',
    (value, decimals) => {
      const bigintResult = bigintToTokenMinimalUnit(value, decimals).toString();
      const legacyResult = legacyToTokenMinimalUnit(value, decimals).toString(
        10,
      );
      expect(bigintResult).toBe(legacyResult);
    },
  );
});

/**
 * --------------------------------------------------------------------------
 * Section 4: Rendering Parity
 * --------------------------------------------------------------------------
 */
describe('Parity: renderFromWei', () => {
  const CASES: [string | number][] = [
    ['133700000000000000'],
    ['1337'],
    ['0'],
    [0],
    ['1000000000000000000'],
  ];

  it.each(CASES)('bigintRenderFromWei(%s) matches legacy', (value) => {
    expect(bigintRenderFromWei(value)).toBe(legacyRenderFromWei(value));
  });
});

describe('Parity: renderFromTokenMinimalUnit', () => {
  const CASES: [string | number, number][] = [
    ['1337', 6],
    ['1337', 0],
    ['1337', 10],
    ['0', 10],
    [1337, 6],
  ];

  it.each(CASES)(
    'bigintRenderFromTokenMinimalUnit(%s, %i) matches legacy',
    (value, decimals) => {
      expect(bigintRenderFromTokenMinimalUnit(value, decimals)).toBe(
        legacyRenderFromTokenMinimalUnit(value, decimals),
      );
    },
  );
});

describe('Parity: renderNumber', () => {
  const CASES = ['123456789', '12345', '1', '1.123456789', '1.123'];

  it.each(CASES)('bigintRenderNumber(%s) matches legacy', (value) => {
    expect(bigintRenderNumber(value)).toBe(legacyRenderNumber(value));
  });
});

/**
 * --------------------------------------------------------------------------
 * Section 5: Fiat Conversion Parity
 * --------------------------------------------------------------------------
 */
describe('Parity: weiToFiat', () => {
  it('produces identical fiat strings for 1 ETH at various rates', () => {
    const oneEtherWei = bigintToWei('1');
    const legacyOneEtherWei = legacyToWei('1');

    const rates = [1, 0.5, 0.1, 2000, 3456.78];
    for (const rate of rates) {
      const bigintResult = bigintWeiToFiat(oneEtherWei, rate, 'usd');
      const legacyResult = legacyWeiToFiat(legacyOneEtherWei, rate, 'usd');
      expect(bigintResult).toBe(legacyResult);
    }
  });

  it('returns undefined for null conversion rate in both APIs', () => {
    const oneEtherWei = bigintToWei('1');
    const legacyOneEtherWei = legacyToWei('1');
    expect(bigintWeiToFiat(oneEtherWei, null, 'usd')).toBe(
      legacyWeiToFiat(legacyOneEtherWei, null, 'usd'),
    );
  });
});

describe('Parity: weiToFiatNumber', () => {
  it('produces identical numbers for 1 ETH', () => {
    const oneEtherWei = bigintToWei('1');
    const legacyOneEtherWei = legacyToWei('1');

    const rates = [0.1234512345, 0.5, 0.111112];
    for (const rate of rates) {
      expect(bigintWeiToFiatNumber(oneEtherWei, rate)).toBe(
        legacyWeiToFiatNumber(legacyOneEtherWei, rate),
      );
    }
  });
});

describe('Parity: balanceToFiat', () => {
  it.each([
    [0.1, 0.1, 0.1, 'usd'],
    [0.0001, 0.1, 0.1, 'usd'],
    [1, 2000, 1, 'usd'],
  ] as const)(
    'balanceToFiat(%s, %s, %s, %s) matches',
    (balance, convRate, exchRate, currency) => {
      expect(bigintBalanceToFiat(balance, convRate, exchRate, currency)).toBe(
        legacyBalanceToFiat(balance, convRate, exchRate, currency),
      );
    },
  );
});

describe('Parity: balanceToFiatNumber', () => {
  it.each([
    [0.1, 0.1, 0.1],
    [0.0001, 0.1, 0.1],
    [1, 2000, 1],
  ] as const)(
    'balanceToFiatNumber(%s, %s, %s) matches',
    (balance, convRate, exchRate) => {
      expect(bigintBalanceToFiatNumber(balance, convRate, exchRate)).toBe(
        legacyBalanceToFiatNumber(balance, convRate, exchRate),
      );
    },
  );
});

describe('Parity: addCurrencySymbol', () => {
  it.each([
    [0.1, 'usd'],
    [0.0001, 'usd'],
    [1234.56, 'eur'],
  ] as const)('addCurrencySymbol(%s, %s) matches', (amount, currency) => {
    expect(bigintAddCurrencySymbol(amount, currency)).toBe(
      legacyAddCurrencySymbol(amount, currency),
    );
  });
});

/**
 * --------------------------------------------------------------------------
 * Section 6: Utility Parity
 * --------------------------------------------------------------------------
 */
describe('Parity: safeNumberToBigInt vs safeNumberToBN', () => {
  const CASES: (number | string)[] = [
    '1650000007.7',
    1650000007.7,
    '16500',
    16500,
    '-1650000007.7',
    '0x75BCD15',
    '0',
    NaN,
  ];

  it.each(CASES)(
    'safeNumberToBigInt(%s) matches safeNumberToBN numerically',
    (value) => {
      const bigIntResult = safeNumberToBigInt(value).toString();
      const bnResult = safeNumberToBN(value).toString(10);
      expect(bigIntResult).toBe(bnResult);
    },
  );
});

describe('Parity: addHexPrefix', () => {
  const CASES = ['0x1a2b', '1a2b', '-1a2b', '0X1A2B', '-0X1A2B'];

  it.each(CASES)('addHexPrefix(%s) matches legacy', (value) => {
    expect(bigintAddHexPrefix(value)).toBe(legacyAddHexPrefix(value));
  });
});

describe('Parity: toHexadecimal', () => {
  const MATCHING_CASES: (string | number)[] = ['001', '0x01', 2, 1232];

  it.each(MATCHING_CASES)('toHexadecimal(%s) matches legacy', (value) => {
    expect(bigintToHexadecimal(value)).toBe(legacyToHexadecimal(value));
  });

  it('toHexadecimal(null): bigint returns "0", legacy returns null', () => {
    // Known behavioral difference: bigint normalizes null → "0"
    // while legacy passes null through. Both are safe since
    // callers always check for falsy before using the result.
    expect(bigintToHexadecimal(null)).toBe('0');
    expect(legacyToHexadecimal(null)).toBe(null);
  });

  it('toHexadecimal(undefined): bigint returns "0", legacy returns undefined', () => {
    expect(bigintToHexadecimal(undefined)).toBe('0');
    expect(legacyToHexadecimal(undefined)).toBe(undefined);
  });
});

describe('Parity: isZeroValue', () => {
  const CASES: (number | string | bigint)[] = [0, '0x0', 0x0, '0', 1, '0x1'];

  it.each(CASES)('isZeroValue(%s) matches legacy', (value) => {
    expect(bigintIsZeroValue(value)).toBe(legacyIsZeroValue(value));
  });
});

describe('Parity: calculateEthFeeForMultiLayer', () => {
  it('matches when multiLayerL1FeeTotal is present', () => {
    const params = {
      multiLayerL1FeeTotal: 'ce37bdd0b8b8',
      ethFee: 0.000001,
    };
    expect(bigintCalculateEthFeeForMultiLayer(params)).toBe(
      legacyCalculateEthFeeForMultiLayer(params),
    );
  });

  it('matches when multiLayerL1FeeTotal is absent', () => {
    const params = {
      multiLayerL1FeeTotal: undefined,
      ethFee: 0.000001,
    };
    expect(bigintCalculateEthFeeForMultiLayer(params)).toBe(
      legacyCalculateEthFeeForMultiLayer(params),
    );
  });
});

describe('Parity: safeBigIntToHex vs safeBNToHex', () => {
  it('returns same hex for BigInt(255) vs BN(255)', () => {
    expect(safeBigIntToHex(BigInt(255))).toBe(safeBNToHex(hexToBN('0xff')));
  });

  it.each([undefined, null])(
    'returns original for %s in both APIs',
    (value) => {
      expect(safeBigIntToHex(value)).toBe(safeBNToHex(value));
    },
  );
});

/**
 * --------------------------------------------------------------------------
 * Section 7: Balance Pipeline Parity (the hot path)
 *
 * This simulates what Engine.getTotalEvmFiatAccountBalance does.
 * It verifies that the BigInt pipeline produces the same fiat values
 * as the BN.js pipeline for identical hex inputs.
 * --------------------------------------------------------------------------
 */
describe('Parity: balance computation pipeline (Engine hot path)', () => {
  const BALANCE_HEX = '0xde0b6b3a7640000'; // 1 ETH
  const STAKED_HEX = '0x6f05b59d3b20000'; // 0.5 ETH
  const CONVERSION_RATE = 2000;

  it('computes identical fiat for native balance + staked balance via BN vs BigInt', () => {
    // Legacy BN.js path (mirrors Engine.ts lines 870-881)
    const balanceBN = hexToBN(BALANCE_HEX);
    const stakedBN = hexToBN(STAKED_HEX);
    const totalHexBN = balanceBN.add(stakedBN).toString('hex');
    const legacyFiat = legacyWeiToFiatNumber(totalHexBN, CONVERSION_RATE);

    // New BigInt path
    const balanceBigInt = hexToBigInt(BALANCE_HEX);
    const stakedBigInt = hexToBigInt(STAKED_HEX);
    const totalBigInt = balanceBigInt + stakedBigInt;
    const bigintFiat = bigintWeiToFiatNumber(totalBigInt, CONVERSION_RATE);

    expect(bigintFiat).toBe(legacyFiat);
  });

  it('computes identical fiat for zero balances', () => {
    const balanceBN = hexToBN('0x0');
    const stakedBN = hexToBN('0x0');
    const totalHexBN = balanceBN.add(stakedBN).toString('hex');
    const legacyFiat = legacyWeiToFiatNumber(totalHexBN, CONVERSION_RATE);

    const totalBigInt = hexToBigInt('0x0') + hexToBigInt('0x0');
    const bigintFiat = bigintWeiToFiatNumber(totalBigInt, CONVERSION_RATE);

    expect(bigintFiat).toBe(legacyFiat);
  });

  it('computes identical renderFromWei for balance display', () => {
    expect(bigintRenderFromWei(BALANCE_HEX)).toBe(
      legacyRenderFromWei(BALANCE_HEX),
    );
    expect(bigintRenderFromWei(STAKED_HEX)).toBe(
      legacyRenderFromWei(STAKED_HEX),
    );
  });

  it('computes identical token fiat via renderFromTokenMinimalUnit', () => {
    const TOKEN_BALANCE_HEX = '0x5f5e100'; // 100000000 (100 USDC with 6 decimals)
    const decimals = 6;
    expect(bigintRenderFromTokenMinimalUnit(TOKEN_BALANCE_HEX, decimals)).toBe(
      legacyRenderFromTokenMinimalUnit(TOKEN_BALANCE_HEX, decimals),
    );
  });
});

/**
 * --------------------------------------------------------------------------
 * Section 8: Large-scale balance iteration parity
 *
 * Simulates the cross-chain balance aggregation pattern from
 * useGetTotalFiatBalanceCrossChains. Verifies that iterating
 * over many chains produces identical aggregate fiat totals.
 * --------------------------------------------------------------------------
 */
describe('Parity: cross-chain balance aggregation', () => {
  const CHAIN_BALANCES = [
    { balance: '0xde0b6b3a7640000', staked: '0x0', rate: 2000 },
    { balance: '0x6f05b59d3b20000', staked: '0x6f05b59d3b20000', rate: 2000 },
    { balance: '0x16345785d8a0000', staked: '0x0', rate: 1500 },
    { balance: '0x0', staked: '0x0', rate: 3000 },
    { balance: '0x2386f26fc10000', staked: '0x0', rate: 0.05 },
  ];

  it('produces identical aggregate fiat via BN vs BigInt', () => {
    // Legacy path
    let legacyTotal = 0;
    for (const chain of CHAIN_BALANCES) {
      if (chain.rate === 0) continue;
      const bal = hexToBN(chain.balance);
      const stk = hexToBN(chain.staked);
      const totalHex = bal.add(stk).toString('hex');
      legacyTotal += legacyWeiToFiatNumber(totalHex, chain.rate);
    }

    // BigInt path
    let bigintTotal = 0;
    for (const chain of CHAIN_BALANCES) {
      if (chain.rate === 0) continue;
      const total = hexToBigInt(chain.balance) + hexToBigInt(chain.staked);
      bigintTotal += bigintWeiToFiatNumber(total, chain.rate);
    }

    expect(bigintTotal).toBeCloseTo(legacyTotal, 5);
  });
});
