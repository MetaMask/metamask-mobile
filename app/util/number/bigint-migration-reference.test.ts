/*
 * TDD Reference Migration Tests
 *
 * These tests define the exact migration patterns for each hot-path call-site.
 * Each `describe` block corresponds to a specific file + function that needs
 * to be migrated from BN.js → BigInt.
 *
 * The pattern in each test:
 *  1. Show the legacy BN.js call-chain (what's there today)
 *  2. Show the BigInt replacement (what it should become)
 *  3. Assert they produce identical output
 *
 * When all these tests pass, the reference implementation is complete.
 * Feature teams can use these tests as a template.
 */

import {
  hexToBigInt,
  bigIntToHex,
  weiToFiatNumber as bigintWeiToFiatNumber,
  weiToFiat as bigintWeiToFiat,
  renderFromWei as bigintRenderFromWei,
  fromWei as bigintFromWei,
  toWei as bigintToWei,
  toTokenMinimalUnit as bigintToTokenMinimalUnit,
} from './bigint';

import {
  hexToBN,
  BNToHex,
  weiToFiatNumber as legacyWeiToFiatNumber,
  weiToFiat as legacyWeiToFiat,
  renderFromWei as legacyRenderFromWei,
  fromWei as legacyFromWei,
  toWei as legacyToWei,
  toTokenMinimalUnit as legacyToTokenMinimalUnit,
} from './index';

/*
 * --------------------------------------------------------------------------
 * Migration Site 1: Engine.getTotalEvmFiatAccountBalance
 * File: app/core/Engine/Engine.ts (lines 870-915)
 *
 * BEFORE:
 *   const balanceBN = hexToBN(balanceHex);
 *   const stakedBalanceBN = hexToBN(accountData.stakedBalance || '0x00');
 *   const totalAccountBalance = balanceBN.add(stakedBalanceBN).toString('hex');
 *   const chainEthFiat = weiToFiatNumber(totalAccountBalance, conversionRate, decimalsToShow);
 *   const chainNativeBalance = renderFromWei(balanceHex);
 *
 * AFTER:
 *   const balance = hexToBigInt(balanceHex);
 *   const staked = hexToBigInt(accountData.stakedBalance || '0x00');
 *   const total = balance + staked;
 *   const chainEthFiat = weiToFiatNumber(total, conversionRate, decimalsToShow);
 *   const chainNativeBalance = renderFromWei(balanceHex);
 * --------------------------------------------------------------------------
 */
describe('Migration: Engine.getTotalEvmFiatAccountBalance', () => {
  const CASES = [
    {
      label: '1 ETH balance, 0.5 ETH staked',
      balance: '0xde0b6b3a7640000',
      staked: '0x6f05b59d3b20000',
      rate: 2000,
      decimals: 2,
    },
    {
      label: 'zero balance',
      balance: '0x0',
      staked: '0x0',
      rate: 2000,
      decimals: 2,
    },
    {
      label: 'large balance, no staking',
      balance: '0x56bc75e2d63100000', // 100 ETH
      staked: '0x0',
      rate: 3456.78,
      decimals: undefined,
    },
    {
      label: 'dust balance',
      balance: '0x539', // 1337 wei
      staked: '0x0',
      rate: 2000,
      decimals: 2,
    },
  ];

  it.each(CASES)(
    '$label: fiat matches between legacy and BigInt',
    ({ balance, staked, rate, decimals }) => {
      // Legacy path
      const balanceBN = hexToBN(balance);
      const stakedBN = hexToBN(staked);
      const totalHex = balanceBN.add(stakedBN).toString('hex');
      const legacyFiat = legacyWeiToFiatNumber(totalHex, rate, decimals);

      // BigInt path
      const total = hexToBigInt(balance) + hexToBigInt(staked);
      const bigintFiat = bigintWeiToFiatNumber(total, rate, decimals);

      expect(bigintFiat).toBe(legacyFiat);
    },
  );

  it.each(CASES)('$label: renderFromWei matches', ({ balance }) => {
    expect(bigintRenderFromWei(balance)).toBe(legacyRenderFromWei(balance));
  });
});

/*
 * --------------------------------------------------------------------------
 * Migration Site 2: useGetTotalFiatBalanceCrossChains
 * File: app/components/hooks/useGetTotalFiatBalanceCrossChains.tsx (lines 118-135)
 *
 * BEFORE:
 *   const balanceBN = hexToBN(accountData.balance);
 *   const stakedBalanceBN = hexToBN(accountData.stakedBalance || '0x00');
 *   const totalAccountBalance = balanceBN.add(stakedBalanceBN).toString('hex');
 *   ethFiat = weiToFiatNumber(totalAccountBalance, conversionRate, decimalsToShow);
 *
 * AFTER:
 *   const balance = hexToBigInt(accountData.balance);
 *   const staked = hexToBigInt(accountData.stakedBalance || '0x00');
 *   ethFiat = weiToFiatNumber(balance + staked, conversionRate, decimalsToShow);
 * --------------------------------------------------------------------------
 */
describe('Migration: useGetTotalFiatBalanceCrossChains', () => {
  it('produces identical fiat when migrated', () => {
    const chainData = [
      { balance: '0xde0b6b3a7640000', staked: '0x0', rate: 2000 },
      { balance: '0x6f05b59d3b20000', staked: '0x6f05b59d3b20000', rate: 1500 },
      { balance: '0x16345785d8a0000', staked: '0x0', rate: 2500 },
    ];

    let legacyTotalFiat = 0;
    let bigintTotalFiat = 0;

    for (const chain of chainData) {
      const decimalsToShow = 2;

      // Legacy
      const balanceBN = hexToBN(chain.balance);
      const stakedBN = hexToBN(chain.staked);
      const totalHex = balanceBN.add(stakedBN).toString('hex');
      legacyTotalFiat += legacyWeiToFiatNumber(
        totalHex,
        chain.rate,
        decimalsToShow,
      );

      // BigInt
      const total = hexToBigInt(chain.balance) + hexToBigInt(chain.staked);
      bigintTotalFiat += bigintWeiToFiatNumber(
        total,
        chain.rate,
        decimalsToShow,
      );
    }

    expect(bigintTotalFiat).toBeCloseTo(legacyTotalFiat, 2);
  });
});

/*
 * --------------------------------------------------------------------------
 * Migration Site 3: selectNativeEvmAsset / selectStakedEvmAsset
 * File: app/selectors/multichain/evm.ts (lines 290-350)
 *
 * BEFORE:
 *   balance: renderFromWei(accountBalanceByChainId.balance),
 *   balanceFiat: weiToFiat(hexToBN(accountBalanceByChainId.balance) as any, conversionRate, currentCurrency),
 *   // staked:
 *   hexToBN(accountBalanceByChainId.stakedBalance).isZero()
 *
 * AFTER:
 *   balance: renderFromWei(accountBalanceByChainId.balance),
 *   balanceFiat: weiToFiat(hexToBigInt(accountBalanceByChainId.balance), conversionRate, currentCurrency),
 *   // staked:
 *   hexToBigInt(accountBalanceByChainId.stakedBalance) === 0n
 * --------------------------------------------------------------------------
 */
describe('Migration: selectNativeEvmAsset / selectStakedEvmAsset', () => {
  const BALANCE_HEX = '0xde0b6b3a7640000'; // 1 ETH
  const STAKED_HEX = '0x6f05b59d3b20000'; // 0.5 ETH

  it('renderFromWei is identical (same input, same output)', () => {
    expect(bigintRenderFromWei(BALANCE_HEX)).toBe(
      legacyRenderFromWei(BALANCE_HEX),
    );
  });

  it('weiToFiat produces identical string for native balance', () => {
    // Legacy: weiToFiat(hexToBN(balance) as any, rate, currency)
    const legacyResult = legacyWeiToFiat(hexToBN(BALANCE_HEX), 2000, 'usd');
    // BigInt: weiToFiat(hexToBigInt(balance), rate, currency)
    const bigintResult = bigintWeiToFiat(hexToBigInt(BALANCE_HEX), 2000, 'usd');
    expect(bigintResult).toBe(legacyResult);
  });

  it('zero check works identically', () => {
    // Legacy: hexToBN(stakedBalance).isZero()
    const legacyIsZero = hexToBN('0x0').isZero();
    // BigInt: hexToBigInt(stakedBalance) === 0n
    const bigintIsZero = hexToBigInt('0x0') === 0n;
    expect(bigintIsZero).toBe(legacyIsZero);

    const legacyNotZero = hexToBN(STAKED_HEX).isZero();
    const bigintNotZero = hexToBigInt(STAKED_HEX) === 0n;
    expect(bigintNotZero).toBe(legacyNotZero);
  });

  it('weiToFiat for staked balance matches', () => {
    const legacyResult = legacyWeiToFiat(hexToBN(STAKED_HEX), 2000, 'usd');
    const bigintResult = bigintWeiToFiat(hexToBigInt(STAKED_HEX), 2000, 'usd');
    expect(bigintResult).toBe(legacyResult);
  });
});

/*
 * --------------------------------------------------------------------------
 * Migration Site 4: selectStakedAssets
 * File: app/selectors/assets/assets-list.ts (lines 194-219)
 *
 * BEFORE:
 *   const fiatBalance = conversionRate
 *     ? weiToFiatNumber(hexToBN(stakedBalance), conversionRate)
 *     : undefined;
 *   balance: fromWei(stakedBalance),
 *
 * AFTER:
 *   const fiatBalance = conversionRate
 *     ? weiToFiatNumber(hexToBigInt(stakedBalance), conversionRate)
 *     : undefined;
 *   balance: fromWei(hexToBigInt(stakedBalance)),
 * --------------------------------------------------------------------------
 */
describe('Migration: selectStakedAssets (assets-list.ts)', () => {
  const STAKED_HEX = '0x6f05b59d3b20000'; // 0.5 ETH
  const RATE = 2000;

  it('fiatBalance matches', () => {
    const legacyFiat = legacyWeiToFiatNumber(hexToBN(STAKED_HEX), RATE);
    const bigintFiat = bigintWeiToFiatNumber(hexToBigInt(STAKED_HEX), RATE);
    expect(bigintFiat).toBe(legacyFiat);
  });

  it('balance (fromWei) matches', () => {
    const legacyBalance = legacyFromWei(STAKED_HEX);
    const bigintBalance = bigintFromWei(hexToBigInt(STAKED_HEX));
    expect(bigintBalance).toBe(legacyBalance);
  });
});

/*
 * --------------------------------------------------------------------------
 * Migration Site 5: earnController selectors
 * File: app/selectors/earnController/earn/index.ts (lines 244-265)
 *
 * BEFORE:
 *   const balanceWei = hexToBN(rawAccountBalance);
 *   const stakedBalanceWei = hexToBN(rawStakedAccountBalance);
 *   tokenBalanceMinimalUnit = token.isStaked ? stakedBalanceWei : balanceWei;
 *   // or for non-native tokens:
 *   tokenBalanceMinimalUnit = hexToBN(tokenBalances?.[...]);
 *   const balanceFiatNumber = weiToFiatNumber(balanceWei.toString(), rate, 2);
 *
 * AFTER:
 *   const balanceWei = hexToBigInt(rawAccountBalance);
 *   const stakedBalanceWei = hexToBigInt(rawStakedAccountBalance);
 *   tokenBalanceMinimalUnit = token.isStaked ? stakedBalanceWei : balanceWei;
 *   // or for non-native tokens:
 *   tokenBalanceMinimalUnit = hexToBigInt(tokenBalances?.[...]);
 *   const balanceFiatNumber = weiToFiatNumber(balanceWei, rate, 2);
 * --------------------------------------------------------------------------
 */
describe('Migration: earnController selectors', () => {
  const BALANCE_HEX = '0xde0b6b3a7640000'; // 1 ETH
  const STAKED_HEX = '0x6f05b59d3b20000'; // 0.5 ETH
  const TOKEN_HEX = '0x5f5e100'; // 100 USDC (6 decimals)
  const ETH_USD_RATE = 2000;

  it('native balance fiat matches', () => {
    // Legacy: weiToFiatNumber(hexToBN(hex).toString(), rate, 2)
    const legacyFiat = legacyWeiToFiatNumber(
      hexToBN(BALANCE_HEX).toString(),
      ETH_USD_RATE,
      2,
    );

    // BigInt: weiToFiatNumber(hexToBigInt(hex), rate, 2)
    const bigintFiat = bigintWeiToFiatNumber(
      hexToBigInt(BALANCE_HEX),
      ETH_USD_RATE,
      2,
    );

    expect(bigintFiat).toBe(legacyFiat);
  });

  it('token balance via hexToBigInt matches hexToBN numerically', () => {
    const legacyBN = hexToBN(TOKEN_HEX);
    const bigintVal = hexToBigInt(TOKEN_HEX);
    expect(bigintVal.toString()).toBe(legacyBN.toString(10));
  });

  it('staked balance selection works the same', () => {
    const isStaked = true;
    const legacyBalance = hexToBN(BALANCE_HEX);
    const legacyStaked = hexToBN(STAKED_HEX);
    const legacyResult = isStaked ? legacyStaked : legacyBalance;

    const bigintBalance = hexToBigInt(BALANCE_HEX);
    const bigintStaked = hexToBigInt(STAKED_HEX);
    const bigintResult = isStaked ? bigintStaked : bigintBalance;

    expect(bigintResult.toString()).toBe(legacyResult.toString(10));
  });
});

/*
 * --------------------------------------------------------------------------
 * Migration Site 6: send context utils
 * File: app/components/Views/confirmations/context/send-context/utils.ts
 *
 * BEFORE:
 *   trxnParams.value = BNToHex(toWei(value ?? '0') as unknown as BN);
 *   const tokenAmount = toTokenMinimalUnit(value ?? '0', asset.decimals ?? 0);
 *   trxnParams.data = generateTransferData('transfer', {
 *     toAddress: to,
 *     amount: BNToHex(tokenAmount),
 *   });
 *
 * AFTER:
 *   trxnParams.value = bigIntToHex(toWei(value ?? '0'));
 *   const tokenAmount = toTokenMinimalUnit(value ?? '0', asset.decimals ?? 0);
 *   trxnParams.data = generateTransferData('transfer', {
 *     toAddress: to,
 *     amount: bigIntToHex(tokenAmount),
 *   });
 * --------------------------------------------------------------------------
 */
describe('Migration: send-context utils', () => {
  it('native ETH: bigIntToHex(toWei(value)) matches BNToHex(toWei(value))', () => {
    const values = ['0', '1', '0.5', '0.000000000000001337'];
    for (const value of values) {
      const legacyHex = BNToHex(legacyToWei(value));
      const bigintHex = bigIntToHex(bigintToWei(value));
      expect(bigintHex).toBe(legacyHex);
    }
  });

  it('ERC-20: bigIntToHex(toTokenMinimalUnit(value, decimals)) matches BNToHex', () => {
    const cases = [
      { value: '100', decimals: 6 },
      { value: '0.5', decimals: 18 },
      { value: '1337', decimals: 0 },
      { value: '0.001337', decimals: 6 },
    ];

    for (const { value, decimals } of cases) {
      const legacyMinimal = legacyToTokenMinimalUnit(value, decimals);
      const legacyHex = BNToHex(legacyMinimal);

      const bigintMinimal = bigintToTokenMinimalUnit(value, decimals);
      const bigintHex = bigIntToHex(bigintMinimal);

      expect(bigintHex).toBe(legacyHex);
    }
  });
});

/*
 * --------------------------------------------------------------------------
 * Migration Site 7: Ramp / Stake balance hooks
 * Files:
 *   - app/components/UI/Ramp/Aggregator/hooks/useBalance.ts
 *   - app/components/UI/Stake/hooks/useBalance.ts
 *
 * These follow the same hexToBN pattern.
 * --------------------------------------------------------------------------
 */
describe('Migration: Ramp/Stake useBalance hooks', () => {
  const BALANCE_HEX = '0x1bc16d674ec80000'; // 2 ETH

  it('hexToBigInt produces same numeric value as hexToBN', () => {
    const bn = hexToBN(BALANCE_HEX);
    const bi = hexToBigInt(BALANCE_HEX);
    expect(bi.toString(10)).toBe(bn.toString(10));
  });

  it('BigInt addition matches BN.add for balance computations', () => {
    const bal1 = '0xde0b6b3a7640000'; // 1 ETH
    const bal2 = '0x1bc16d674ec80000'; // 2 ETH

    const bnSum = hexToBN(bal1).add(hexToBN(bal2));
    const biSum = hexToBigInt(bal1) + hexToBigInt(bal2);

    expect(biSum.toString(10)).toBe(bnSum.toString(10));
  });

  it('BigInt comparison matches BN comparison for balance checks', () => {
    const bal1 = hexToBigInt('0xde0b6b3a7640000');
    const bal2 = hexToBigInt('0x1bc16d674ec80000');

    const bnBal1 = hexToBN('0xde0b6b3a7640000');
    const bnBal2 = hexToBN('0x1bc16d674ec80000');

    // BN.js uses .gt(), BigInt uses >
    expect(bal2 > bal1).toBe(bnBal2.gt(bnBal1));
    expect(bal1 > bal2).toBe(bnBal1.gt(bnBal2));
    const bal1Again = bal1;
    expect(bal1 === bal1Again).toBe(bnBal1.eq(bnBal1));
  });
});

/*
 * --------------------------------------------------------------------------
 * Migration Checklist Tests
 *
 * These tests verify that the BigInt API provides 1:1 replacements for
 * every BN.js operation pattern found in the codebase.
 * --------------------------------------------------------------------------
 */
describe('Migration API completeness', () => {
  it('provides hexToBigInt as replacement for hexToBN', () => {
    expect(typeof hexToBigInt).toBe('function');
    expect(typeof hexToBigInt('0x1')).toBe('bigint');
  });

  it('provides bigIntToHex as replacement for BNToHex', () => {
    expect(typeof bigIntToHex).toBe('function');
    expect(bigIntToHex(1n)).toBe('0x1');
  });

  it('native BigInt supports .add() equivalent via +', () => {
    const a = 1000000000000000000n;
    const b = 500000000000000000n;
    expect(a + b).toBe(1500000000000000000n);
  });

  it('native BigInt supports .sub() equivalent via -', () => {
    const a = 1000000000000000000n;
    const b = 500000000000000000n;
    expect(a - b).toBe(500000000000000000n);
  });

  it('native BigInt supports .mul() equivalent via *', () => {
    const a = 1000000000n;
    const b = 1000000000n;
    expect(a * b).toBe(1000000000000000000n);
  });

  it('native BigInt supports .isZero() equivalent via === 0n', () => {
    expect(0n).toBe(0n);
  });

  it('native BigInt supports .gt()/.lt()/.gte()/.lte() equivalents', () => {
    expect(2n > 1n).toBe(true);
    expect(1n < 2n).toBe(true);
    const one = 1n;
    expect(one >= 1n).toBe(true);
    expect(one <= 1n).toBe(true);
  });

  it('native BigInt supports .toString(16) for hex output', () => {
    expect(255n.toString(16)).toBe('ff');
  });

  it('native BigInt supports .toString(10) for decimal output', () => {
    expect(1000000000000000000n.toString(10)).toBe('1000000000000000000');
  });

  it('weiToFiatNumber accepts bigint input directly', () => {
    const wei = 1000000000000000000n;
    const result = bigintWeiToFiatNumber(wei, 2000);
    expect(typeof result).toBe('number');
    expect(result).toBe(2000);
  });

  it('weiToFiat accepts bigint input directly', () => {
    const wei = 1000000000000000000n;
    const result = bigintWeiToFiat(wei, 2000, 'usd');
    expect(result).toBe('$2000.00');
  });

  it('renderFromWei accepts hex string input (no migration needed)', () => {
    const result = bigintRenderFromWei('0xde0b6b3a7640000');
    expect(result).toBe('1');
  });
});
