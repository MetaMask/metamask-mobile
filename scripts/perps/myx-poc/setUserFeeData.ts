/**
 * MYX PoC — Validate EIP-712 Domain for setUserFeeData
 *
 * Tests the corrected EIP-712 domain spec provided by MYX team (2026-03-27):
 *   name: "Broker" (NOT "Metamask Broker")
 *   version: "1.0"
 *   chainId: <deployment chain>
 *   verifyingContract: <broker contract address>
 *
 * Previous failure cause: activateBrokerRebate.ts used name="Metamask Broker"
 * and omitted version, causing ECDSAInvalidSignature / NotBrokerSigner reverts.
 *
 * Usage:
 *   NETWORK=testnet yarn tsx setUserFeeData.ts
 *   NETWORK=testnet yarn tsx setUserFeeData.ts --dry-run
 *   NETWORK=testnet yarn tsx setUserFeeData.ts --rebate-pct 50 --referrer-pct 50
 */

import { privateKeyToAccount } from 'viem/accounts';
import {
  getNetworkConfig,
  createMyxClient,
  authenticateClient,
  ADDRESS,
  parseArgs,
} from './common';
import type { TradeFlowItem } from '@myx-trade/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.myx.env') });

const DIVIDER = '='.repeat(72);

function getBrokerOwnerKey(chainId: number): { key: string; address: string } {
  if (chainId === 59141) {
    return {
      key: process.env.BROKER_OWNER_KEY_LINEA_SEPOLIA || '',
      address: process.env.BROKER_OWNER_ADDRESS_LINEA_SEPOLIA || '',
    };
  }
  if (chainId === 421614) {
    return {
      key: process.env.BROKER_OWNER_KEY_ARB_SEPOLIA || '',
      address: process.env.BROKER_OWNER_ADDRESS_ARB_SEPOLIA || '',
    };
  }
  throw new Error('No broker owner key for chainId ' + chainId);
}

async function main() {
  const config = getNetworkConfig();
  const args = parseArgs(process.argv.slice(2));
  const totalRebatePct = parseInt(args['rebate-pct'] || '50', 10);
  const referrerPct = parseInt(args['referrer-pct'] || '50', 10);
  const dryRun = process.argv.includes('--dry-run');

  console.log(DIVIDER);
  console.log('MYX setUserFeeData — EIP-712 Domain Validation');
  console.log(`Network: ${config.isTestnet ? 'testnet' : 'mainnet'} (chainId ${config.chainId})`);
  console.log(`User address: ${ADDRESS}`);
  console.log(`Broker address: ${config.brokerAddress}`);
  console.log(`Rebate config: totalReferralRebatePct=${totalRebatePct}, referrerRebatePct=${referrerPct}`);
  if (dryRun) console.log('DRY RUN — will generate signature but not submit tx');
  console.log(DIVIDER);

  // Get broker owner credentials
  const ownerCreds = getBrokerOwnerKey(config.chainId);
  if (!ownerCreds.key) {
    console.error('ERROR: No broker owner key found. Add BROKER_OWNER_KEY_* to .myx.env');
    process.exit(1);
  }

  const ownerAccount = privateKeyToAccount(('0x' + ownerCreds.key) as `0x${string}`);
  console.log(`\nBroker owner: ${ownerAccount.address}`);
  if (ownerAccount.address.toLowerCase() !== ownerCreds.address.toLowerCase()) {
    console.error(`ERROR: Derived address ${ownerAccount.address} does not match expected ${ownerCreds.address}`);
    process.exit(1);
  }

  // Initialize MYX client (as the user, not the owner)
  const client = createMyxClient(config);
  await authenticateClient(client, config);

  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const nonce = '1'; // First-time setup

  const feeDataParams = {
    tier: 0,
    referrer: config.brokerAddress,
    totalReferralRebatePct: totalRebatePct,
    referrerRebatePct: referrerPct,
    nonce,
  };

  // Corrected EIP-712 domain from MYX team (2026-03-27)
  // Key differences from activateBrokerRebate.ts:
  //   - name: "Broker" (was "Metamask Broker")
  //   - version: "1.0" (was missing)
  const domain = {
    name: 'Broker',
    version: '1.0',
    chainId: config.chainId,
    verifyingContract: config.brokerAddress as `0x${string}`,
  };

  // EIP-712 struct types (unchanged from activateBrokerRebate.ts)
  const types = {
    SetUserFeeData: [
      { name: 'user', type: 'address' },
      { name: 'nonce', type: 'uint64' },
      { name: 'deadline', type: 'uint64' },
      { name: 'feeData', type: 'FeeData' },
    ],
    FeeData: [
      { name: 'tier', type: 'uint8' },
      { name: 'referrer', type: 'address' },
      { name: 'totalReferralRebatePct', type: 'uint32' },
      { name: 'referrerRebatePct', type: 'uint32' },
    ],
  };

  const message = {
    user: ADDRESS as `0x${string}`,
    nonce: BigInt(nonce),
    deadline: BigInt(deadline),
    feeData: {
      tier: feeDataParams.tier,
      referrer: config.brokerAddress as `0x${string}`,
      totalReferralRebatePct: totalRebatePct,
      referrerRebatePct: referrerPct,
    },
  };

  console.log('\nEIP-712 domain (corrected):', JSON.stringify(domain, null, 2));
  console.log('EIP-712 types: SetUserFeeData -> FeeData (nested struct)');
  console.log('EIP-712 message:', JSON.stringify(message, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  let signature: string;
  try {
    signature = await ownerAccount.signTypedData({
      domain,
      types,
      primaryType: 'SetUserFeeData',
      message,
    });
    console.log(`\nSignature generated: ${signature.slice(0, 20)}...${signature.slice(-10)}`);
  } catch (err) {
    console.error('\nFailed to generate EIP-712 signature:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  if (dryRun) {
    console.log('\nDRY RUN complete. Signature generated but not submitted.');
    console.log(`Full signature: ${signature}`);
    client.close();
    return;
  }

  // Call setUserFeeData with the corrected EIP-712 signature
  console.log('\nCalling setUserFeeData on broker contract...');

  try {
    const result = await client.account.setUserFeeData(
      ADDRESS,
      config.chainId,
      deadline,
      feeDataParams,
      signature,
    );

    const code = (result as { code?: number }).code;
    if (code === 0) {
      console.log('\nSUCCESS! Broker rebate activated with corrected EIP-712 domain.');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('\nEIP-712 domain spec validated:');
      console.log('  name: "Broker"');
      console.log('  version: "1.0"');
      console.log(`  chainId: ${config.chainId}`);
      console.log(`  verifyingContract: ${config.brokerAddress}`);
    } else {
      const msg = (result as { message?: string }).message || 'unknown';
      console.log(`\nFailed with code=${code}: ${msg}`);
      console.log('Full response:', JSON.stringify(result, null, 2));

      if (String(msg).includes('ECDSAInvalidSignature') || String(msg).includes('NotBrokerSigner')) {
        console.log('\nEIP-712 domain still incorrect. Possible issues:');
        console.log('  - Struct types may differ from what contract expects');
        console.log('  - Testnet broker contract may use different domain than MYX BNB example');
        console.log('  - Nonce may not be 1 (check if setUserFeeData was called before)');
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`\nTransaction failed: ${msg}`);

    if (msg.includes('ECDSAInvalidSignature') || msg.includes('NotBrokerSigner')) {
      console.log('\nEIP-712 domain still incorrect — see notes above.');
    }
  }

  // Post-check: verify rebate fields in trade history
  console.log('\n' + DIVIDER);
  console.log('Post-check: trade history rebate fields...');

  try {
    const tradeFlowResp = await client.account.getTradeFlow(
      { limit: 3, chainId: config.chainId },
      ADDRESS,
    );
    const trades: TradeFlowItem[] = tradeFlowResp.code === 0 ? tradeFlowResp.data : [];
    if (trades.length > 0) {
      for (const t of trades) {
        console.log(`  orderId=${t.orderId}: referrerRebate=${t.referrerRebate}, referralRebate=${t.referralRebate}`);
      }
    } else {
      console.log('  No trades found');
    }
  } catch {
    console.log('  Failed to fetch trade history');
  }

  console.log('\n' + DIVIDER);
  console.log('Done.');
  client.close();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
