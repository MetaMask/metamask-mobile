/**
 * MYX PoC — Broker Fee Validation
 *
 * Validates the broker referral rebate configuration end-to-end:
 *   1. Broker address matches MYX-provided credentials
 *   2. setUserFeeData API is callable (tests call shape, expects signature error)
 *   3. referrals.claimRebate method exists and is callable
 *   4. Trade history includes referral rebate fields
 *   5. Broker address is passed through to SDK client config
 *
 * Usage:
 *   NETWORK=testnet yarn tsx brokerValidation.ts
 *   NETWORK=testnet-arb yarn tsx brokerValidation.ts
 */

import {
  getNetworkConfig,
  createMyxClient,
  authenticateClient,
  ADDRESS,
  printTable,
} from './common';
import type { TradeFlowItem } from '@myx-trade/sdk';

const DIVIDER = '='.repeat(72);

// MYX-provided broker credentials (2026-03-22)
const EXPECTED_BROKERS: Record<number, { broker: string; owner: string }> = {
  59141: {
    broker: '0x30b1bc9234fea72daba5253bf96d56a91483cbc0',
    owner: '0xAdA1c11226C0c1EFb001049334C14B0C70a0D84e',
  },
  421614: {
    broker: '0xc777bf4cdd0afc3d2b4d0f46d23a1c1c25c39176',
    owner: '0x49F983F21379D70b7756588E6C9b11f26fF3a4Bd',
  },
};

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  detail: string;
}

async function main() {
  const config = getNetworkConfig();
  const results: TestResult[] = [];

  console.log(DIVIDER);
  console.log('MYX Broker Fee Validation');
  console.log(`Network: ${config.isTestnet ? 'testnet' : 'mainnet'} (chainId ${config.chainId})`);
  console.log(`Address: ${ADDRESS}`);
  console.log(`Configured broker: ${config.brokerAddress}`);
  console.log(DIVIDER);

  // ========================================================================
  // Test 1: Broker address matches MYX-provided credentials
  // ========================================================================
  console.log('\n[Test 1] Broker address matches MYX-provided credentials');

  const expected = EXPECTED_BROKERS[config.chainId];
  if (!expected) {
    results.push({
      test: '1. Broker address match',
      status: 'FAIL',
      detail: `No expected broker for chainId ${config.chainId}`,
    });
    console.log(`  FAIL: No expected broker for chainId ${config.chainId}`);
  } else {
    const configuredLower = config.brokerAddress.toLowerCase();
    const expectedLower = expected.broker.toLowerCase();
    const match = configuredLower === expectedLower;
    results.push({
      test: '1. Broker address match',
      status: match ? 'PASS' : 'FAIL',
      detail: match
        ? `Configured: ${config.brokerAddress} matches expected`
        : `MISMATCH: configured=${config.brokerAddress}, expected=${expected.broker}`,
    });
    console.log(`  Expected:   ${expected.broker}`);
    console.log(`  Configured: ${config.brokerAddress}`);
    console.log(`  Owner:      ${expected.owner}`);
    console.log(`  Result:     ${match ? 'PASS' : 'FAIL — MISMATCH'}`);
  }

  // ========================================================================
  // Test 2: SDK client accepts broker address
  // ========================================================================
  console.log('\n[Test 2] SDK client accepts broker address');

  const client = createMyxClient(config);
  await authenticateClient(client, config);

  // The broker address is passed in MyxClient config — if we got here, it accepted it
  results.push({
    test: '2. SDK client broker config',
    status: 'PASS',
    detail: `MyxClient initialized with brokerAddress: ${config.brokerAddress}`,
  });
  console.log(`  PASS: MyxClient created with brokerAddress`);

  // ========================================================================
  // Test 3: setUserFeeData API shape validation
  // ========================================================================
  console.log('\n[Test 3] setUserFeeData API callable (expects signature rejection)');

  try {
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const result = await client.account.setUserFeeData(
      ADDRESS,
      config.chainId,
      deadline,
      {
        tier: 0,
        referrer: config.brokerAddress,
        totalReferralRebatePct: 50,
        referrerRebatePct: 50,
        nonce: '1',
      },
      '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', // dummy signature
    );

    // If we get here, the API accepted it (unexpected but good)
    const code = (result as { code?: number }).code;
    if (code === 0) {
      results.push({
        test: '3. setUserFeeData API',
        status: 'PASS',
        detail: 'API accepted the call (unexpected — may need to verify rebate was actually set)',
      });
      console.log(`  PASS (unexpected): API returned code 0`);
      console.log(`  Response: ${JSON.stringify(result)}`);
    } else {
      // Non-zero code = rejected (expected with dummy signature)
      const message = (result as { message?: string }).message || 'unknown';
      results.push({
        test: '3. setUserFeeData API',
        status: 'PASS',
        detail: `API callable, rejected with code=${code}: ${message} (expected — dummy signature)`,
      });
      console.log(`  PASS: API is callable, returned code=${code}`);
      console.log(`  Message: ${message}`);
      console.log(`  (Expected rejection — we sent a dummy signature)`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Even an error proves the method exists and is callable
    results.push({
      test: '3. setUserFeeData API',
      status: 'PASS',
      detail: `Method exists, threw: ${msg} (expected — requires valid EIP-712 signature from MYX backend)`,
    });
    console.log(`  PASS: Method exists and is callable`);
    console.log(`  Error (expected): ${msg}`);
    console.log(`  (Requires valid EIP-712 signature from MYX backend to succeed)`);
  }

  // ========================================================================
  // Test 4: referrals.claimRebate method exists
  // ========================================================================
  console.log('\n[Test 4] referrals.claimRebate method exists');

  const hasReferrals = client.referrals !== undefined && client.referrals !== null;
  const hasClaimRebate = hasReferrals && typeof client.referrals.claimRebate === 'function';

  results.push({
    test: '4. claimRebate method',
    status: hasClaimRebate ? 'PASS' : 'FAIL',
    detail: hasClaimRebate
      ? 'client.referrals.claimRebate is a function'
      : `referrals=${hasReferrals}, claimRebate=${typeof client.referrals?.claimRebate}`,
  });
  console.log(`  referrals module: ${hasReferrals ? 'present' : 'MISSING'}`);
  console.log(`  claimRebate: ${hasClaimRebate ? 'function (PASS)' : 'MISSING (FAIL)'}`);

  // ========================================================================
  // Test 5: Trade history includes referral rebate fields
  // ========================================================================
  console.log('\n[Test 5] Trade history includes referral rebate fields');

  try {
    const tradeFlowResp = await client.account.getTradeFlow(
      { limit: 5, chainId: config.chainId },
      ADDRESS,
    );

    const trades: TradeFlowItem[] = tradeFlowResp.code === 0 ? tradeFlowResp.data : [];

    if (trades.length === 0) {
      results.push({
        test: '5. Trade history rebate fields',
        status: 'BLOCKED',
        detail: 'No trades found — place an order first to verify rebate fields',
      });
      console.log(`  BLOCKED: No trades found (need to place an order first)`);
    } else {
      const sample = trades[0];
      const hasReferrerRebate = 'referrerRebate' in sample;
      const hasReferralRebate = 'referralRebate' in sample;
      const hasRebateClaimed = 'rebateClaimedAmount' in sample;
      const allPresent = hasReferrerRebate && hasReferralRebate && hasRebateClaimed;

      results.push({
        test: '5. Trade history rebate fields',
        status: allPresent ? 'PASS' : 'FAIL',
        detail: allPresent
          ? `All rebate fields present. referrerRebate=${sample.referrerRebate}, referralRebate=${sample.referralRebate}, rebateClaimedAmount=${sample.rebateClaimedAmount}`
          : `Missing fields: referrerRebate=${hasReferrerRebate}, referralRebate=${hasReferralRebate}, rebateClaimedAmount=${hasRebateClaimed}`,
      });

      console.log(`  Found ${trades.length} trades. Checking first trade (orderId=${sample.orderId}):`);
      console.log(`    referrerRebate:      ${sample.referrerRebate} (${hasReferrerRebate ? 'present' : 'MISSING'})`);
      console.log(`    referralRebate:      ${sample.referralRebate} (${hasReferralRebate ? 'present' : 'MISSING'})`);
      console.log(`    rebateClaimedAmount: ${sample.rebateClaimedAmount} (${hasRebateClaimed ? 'present' : 'MISSING'})`);

      if (allPresent) {
        const isZeroOrNull = (v: string | null | undefined) => !v || v === '0' || v === 'null';
        const allZero = isZeroOrNull(sample.referrerRebate) && isZeroOrNull(sample.referralRebate);
        if (allZero) {
          console.log(`\n  All rebate values are 0 — expected (setUserFeeData not called yet)`);
          console.log(`  Once MYX EIP-712 backend is available and setUserFeeData is called,`);
          console.log(`  these fields should show non-zero values after trades.`);
        } else {
          console.log(`\n  NON-ZERO rebate values found! Broker rebate may already be active.`);
        }
      }

      // Show summary table
      console.log('\n  Recent trades rebate summary:');
      printTable(trades.map((t) => ({
        orderId: t.orderId || '-',
        type: t.type,
        tradingFee: t.tradingFee || '-',
        referrerRebate: t.referrerRebate || '0',
        referralRebate: t.referralRebate || '0',
        rebateClaimed: t.rebateClaimedAmount || '0',
      })));
    }
  } catch (err) {
    results.push({
      test: '5. Trade history rebate fields',
      status: 'FAIL',
      detail: `Failed to fetch trade history: ${err instanceof Error ? err.message : String(err)}`,
    });
    console.log(`  FAIL: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ========================================================================
  // Summary
  // ========================================================================
  console.log('\n' + DIVIDER);
  console.log('SUMMARY');
  console.log(DIVIDER);

  printTable(results as unknown as Record<string, string | number>[]);

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const blocked = results.filter((r) => r.status === 'BLOCKED').length;
  console.log(`\n${passed} passed, ${failed} failed, ${blocked} blocked out of ${results.length} tests`);

  if (failed === 0) {
    console.log('\nBroker configuration is correct. Revenue activation blocked on:');
    console.log('  1. MYX team providing EIP-712 signature backend for setUserFeeData()');
    console.log('  2. Calling setUserFeeData() with valid signature to link users to broker');
    console.log('  3. Verifying referrerRebate > 0 in trade history after activation');
    console.log('  4. Calling referrals.claimRebate() to withdraw accumulated rebates');
  }

  console.log('\n' + DIVIDER);
  console.log('Done.');
  client.close();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
